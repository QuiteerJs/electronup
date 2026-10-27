import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { ElectronApplication, Page } from '@playwright/test';
import { _electron as electron, expect, test } from '@playwright/test';

/**
 * 真 Electron 冒烟测试
 *
 * 单测里的 electron 都是替身, 这里补上替身覆盖不到的部分:
 * sandbox 下预加载脚本能拿到哪些模块、contextBridge 能否传递返回值、主进程通道是否真的接通
 */

declare global {
  interface Window {
    $ipc: import('@quiteer/electron-preload').PreloadIpc;
    $clipboard: import('@quiteer/electron-preload').PreloadClipboard;
    $webFrame: import('@quiteer/electron-preload').PreloadWebFrame;
  }
}

const appDir = fileURLToPath(new URL('..', import.meta.url));

let electronApp: ElectronApplication;
let page: Page;
const pageErrors: string[] = [];

test.beforeAll(async () => {
  electronApp = await electron.launch({
    // root 下 (容器 / 部分 CI) Chromium 拒绝启用进程沙箱, 只关进程级沙箱, 渲染层的 sandbox 选项不受影响
    args: [...(process.getuid?.() === 0 ? ['--no-sandbox'] : []), appDir],
  });
  // 主进程报错会走 stderr, 预加载脚本报错会走页面 console
  electronApp.process().stderr?.on('data', (chunk: Buffer) => process.stderr.write(chunk));
  page = await electronApp.firstWindow();
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      pageErrors.push(msg.text());
    }
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.waitForLoadState('domcontentloaded');
});

test.afterAll(async () => {
  await electronApp?.close();
});

test('窗口按名注册并加载页面', async () => {
  await expect(page).toHaveTitle('electron-modules playground');

  const info = await electronApp.evaluate(() => {
    const { windows } = (globalThis as any).playground;
    const win = windows.get('main');
    return {
      names: windows.names(),
      sandbox: win.webContents.getLastWebPreferences().sandbox,
      contextIsolation: win.webContents.getLastWebPreferences().contextIsolation,
    };
  });
  expect(info).toEqual({ names: ['main'], sandbox: true, contextIsolation: true });
});

test('sandbox 下预加载脚本正常执行并暴露三组 API', async () => {
  const exposed = await page.evaluate(() => ({
    $ipc: Object.keys(window.$ipc ?? {}),
    $clipboard: Object.keys(window.$clipboard ?? {}),
    $webFrame: Object.keys(window.$webFrame ?? {}),
    // contextIsolation 生效时页面拿不到 require / process
    require: typeof (window as any).require,
    process: typeof (window as any).process,
  }));

  expect(exposed.$ipc).toEqual(
    expect.arrayContaining(['invoke', 'on', 'once', 'removeAllListeners', 'send', 'sendSync']),
  );
  expect(exposed.$clipboard.length).toBeGreaterThan(0);
  expect(exposed.$webFrame.length).toBeGreaterThan(0);
  expect(exposed.require).toBe('undefined');
  expect(exposed.process).toBe('undefined');
  expect(pageErrors).toEqual([]);
});

test('$ipc.invoke 走通内置路径通道', async () => {
  const joined = await page.evaluate(() =>
    window.$ipc.invoke('__file_options__', 'join', 'a', 'b', '..', 'c'),
  );
  expect(joined).toBe(join('a', 'c'));

  const parsed = await page.evaluate(() =>
    window.$ipc.invoke('__file_options__', 'parse', '/tmp/demo.txt'),
  );
  expect(parsed).toMatchObject({ base: 'demo.txt', ext: '.txt', name: 'demo' });

  // 未知操作在主进程抛错, 应以 rejection 的形式回到页面
  const error = await page.evaluate(() =>
    window.$ipc.invoke('__file_options__', 'nope').then(
      () => '',
      (e: Error) => e.message,
    ),
  );
  expect(error).toContain('未知的路径操作');
});

test('$ipc.send 走通内置窗口通道', async () => {
  await page.evaluate(() => window.$ipc.send('__window_options__', 'setTitle', 'from-renderer'));
  await expect
    .poll(() =>
      electronApp.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]?.getTitle()),
    )
    .toBe('from-renderer');
});

test('$ipc.on 能收到主进程推送, 且返回的函数可以取消监听', async () => {
  await page.evaluate(() => {
    const w = window as any;
    w.received = [];
    w.off = window.$ipc.on('smoke:push', (_event, value) => w.received.push(value));
  });

  const push = (value: number) =>
    electronApp.evaluate(({ BrowserWindow }, v) => {
      BrowserWindow.getAllWindows()[0]?.webContents.send('smoke:push', v);
    }, value);

  await push(1);
  await expect.poll(() => page.evaluate(() => (window as any).received)).toEqual([1]);

  await page.evaluate(() => (window as any).off());
  await push(2);
  // 再推一个由新监听接收的消息作为栅栏, 确认 2 已经送达却被忽略
  await page.evaluate(() => {
    const w = window as any;
    w.barrier = false;
    window.$ipc.once('smoke:barrier', () => (w.barrier = true));
  });
  await electronApp.evaluate(({ BrowserWindow }) => {
    BrowserWindow.getAllWindows()[0]?.webContents.send('smoke:barrier');
  });
  await expect.poll(() => page.evaluate(() => (window as any).barrier)).toBe(true);
  expect(await page.evaluate(() => (window as any).received)).toEqual([1]);
});

test('$clipboard 在 sandbox 下可读写', async () => {
  // 已知缺陷: sandbox 下预加载脚本的 require('electron') 没有 clipboard, 当前实现直接报错。
  // 修复合并后此用例会"意外通过"而报红, 届时删掉这一行
  test.fail();
  const text = `smoke-${Date.now()}`;
  const result = await page.evaluate(async (value) => {
    try {
      await window.$clipboard.writeText(value);
      return { ok: true, text: await window.$clipboard.readText() };
    } catch (error) {
      return { ok: false, text: String(error) };
    }
  }, text);
  expect(result).toEqual({ ok: true, text });
});

test('$webFrame 缩放可读写', async () => {
  const zoom = await page.evaluate(() => {
    window.$webFrame.setZoomFactor(1.5);
    const value = window.$webFrame.getZoomFactor();
    window.$webFrame.setZoomFactor(1);
    return value;
  });
  expect(zoom).toBeCloseTo(1.5);
});

test('应用菜单按路径更新', async () => {
  const label = await electronApp.evaluate(({ Menu }) => {
    const { menus } = (globalThis as any).playground;
    menus.update('app', 'file.quit', { label: '退出应用' });
    return Menu.getApplicationMenu()?.getMenuItemById('file.quit')?.label;
  });
  expect(label).toBe('退出应用');
});

test('托盘创建成功且可切换状态', async () => {
  const tray = await electronApp.evaluate(() => {
    const { trays } = (globalThis as any).playground;
    trays.setState('main', 'busy');
    const controller = trays.getController('main');
    return {
      names: trays.names(),
      state: controller.state,
      destroyed: controller.isDestroyed(),
    };
  });
  expect(tray).toEqual({ names: ['main'], state: 'busy', destroyed: false });
});
