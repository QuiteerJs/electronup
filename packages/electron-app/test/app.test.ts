import assert from 'node:assert/strict';
import { test } from 'node:test';

import { BrowserWindow, app } from 'electron';

import { extractUrls, normalizeSchemes, setupApp } from '../src/index';
import type { AppErrorPhase, OpenSource, SecondInstanceContext } from '../src/index';

type StubApp = typeof app & {
  lock: boolean;
  lockData: unknown[];
  protocols: unknown[][];
  quitCalls: number;
  quitted: boolean;
  setNotReady: () => void;
  markReady: () => void;
  reset: () => void;
  listenerCount: (event: string) => number;
};
type StubWindow = BrowserWindow & { minimized: boolean; visible: boolean; focused: number };

const stub = app as StubApp;

/** 等 whenReady 链路与异步任务跑完 */
const flush = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

function event() {
  return { defaultPrevented: false, preventDefault() {} };
}

test('ready 后依次调用 onReady 与 createMainWindow', async () => {
  stub.reset();
  const order: string[] = [];
  const ctl = setupApp({
    onReady: async () => {
      await flush();
      order.push('ready');
    },
    createMainWindow: () => order.push('window'),
  });

  assert.ok(ctl.isPrimary);
  await flush();
  await flush();
  assert.deepEqual(order, ['ready', 'window']);
  ctl.dispose();
});

test('只能调用一次, dispose 后可重新初始化并移除全部监听', () => {
  stub.reset();
  const ctl = setupApp();
  assert.throws(() => setupApp(), /setupApp 只能调用一次/);
  assert.equal(stub.listenerCount('before-quit'), 1);

  ctl.dispose();
  assert.equal(stub.listenerCount('before-quit'), 0);
  assert.equal(stub.listenerCount('second-instance'), 0);
  setupApp().dispose();
});

test('拿不到单实例锁时退出且不注册监听', () => {
  stub.reset();
  stub.lock = false;
  const ctl = setupApp({ protocols: 'myapp', singleInstance: { additionalData: { a: 1 } } });

  assert.ok(!ctl.isPrimary);
  assert.ok(ctl.isQuitting);
  assert.equal(stub.quitCalls, 1);
  assert.deepEqual(stub.lockData, [{ a: 1 }]);
  assert.equal(stub.listenerCount('second-instance'), 0);
  assert.deepEqual(stub.protocols, []);
  ctl.dispose();
});

test('singleInstance: false 时不请求锁', () => {
  stub.reset();
  stub.lock = false;
  const ctl = setupApp({ singleInstance: false });
  assert.ok(ctl.isPrimary);
  assert.equal(stub.quitCalls, 0);
  assert.equal(stub.listenerCount('second-instance'), 0);
  ctl.dispose();
});

test('第二实例启动时按名还原聚焦主窗口并回调', async () => {
  stub.reset();
  const main = new BrowserWindow() as StubWindow;
  main.minimized = true;
  main.visible = false;
  const contexts: SecondInstanceContext[] = [];

  const ctl = setupApp({
    windows: { get: (name) => (name === 'main' ? main : undefined) },
    mainWindow: 'main',
    onSecondInstance: (ctx) => contexts.push(ctx),
  });
  await flush();

  stub.emit('second-instance', event(), ['electron', '--flag'], '/work', { from: 2 });
  await flush();

  assert.ok(!main.minimized);
  assert.ok(main.visible);
  assert.equal(main.focused, 1);
  assert.deepEqual(contexts, [
    { argv: ['electron', '--flag'], workingDirectory: '/work', additionalData: { from: 2 } },
  ]);
  assert.equal(ctl.getMainWindow(), main);
  ctl.dispose();
});

test('主窗口不存在时 focusMainWindow 调用 createMainWindow', async () => {
  stub.reset();
  let created = 0;
  const ctl = setupApp({ mainWindow: () => undefined, createMainWindow: () => created++ });
  await flush();
  assert.equal(created, 1);

  stub.emit('second-instance', event(), [], '/', undefined);
  await flush();
  assert.equal(created, 2);
  ctl.dispose();

  stub.reset();
  const bare = setupApp({ mainWindow: () => undefined });
  assert.ok(!bare.focusMainWindow());
  bare.dispose();
});

test('mainWindow 传名称时必须提供 windows', () => {
  stub.reset();
  assert.throws(() => setupApp({ mainWindow: 'main' }), /需要同时提供 windows/);
  setupApp().dispose();
});

test('deep link: 注册协议, 统一分发 argv 与 open-url, ready 前缓存', async () => {
  stub.reset();
  stub.setNotReady();
  const received: [string, OpenSource][] = [];
  const argv = [...process.argv];
  process.argv.push('MyApp://launch');

  const ctl = setupApp({
    protocols: ['myapp', 'other:'],
    createMainWindow: () => received.push(['<window>', 'launch']),
    onOpenUrl: (url, { source }) => received.push([url, source]),
  });
  process.argv.splice(0, process.argv.length, ...argv);

  assert.deepEqual(stub.protocols, [['myapp'], ['other']]);

  const open = { defaultPrevented: false, preventDefault: () => (open.defaultPrevented = true) };
  stub.emit('open-url', open, 'myapp://early');
  assert.ok(open.defaultPrevented);
  assert.deepEqual(received, []);

  stub.markReady();
  await flush();
  // 先创建主窗口, 再分发缓存的链接
  assert.deepEqual(received, [
    ['<window>', 'launch'],
    ['MyApp://launch', 'launch'],
    ['myapp://early', 'open-url'],
  ]);

  stub.emit('second-instance', event(), ['electron', 'other://x', 'nope://y'], '/', undefined);
  await flush();
  assert.deepEqual(received.at(-1), ['other://x', 'second-instance']);
  ctl.dispose();
});

test('open-file 交给 onOpenFile', async () => {
  stub.reset();
  const files: string[] = [];
  const ctl = setupApp({ onOpenFile: (path) => files.push(path) });
  await flush();
  stub.emit('open-file', event(), '/tmp/a.txt');
  await flush();
  assert.deepEqual(files, ['/tmp/a.txt']);
  ctl.dispose();
});

test('activate 时没有窗口才重建主窗口', async () => {
  stub.reset();
  let created = 0;
  const ctl = setupApp({ createMainWindow: () => created++ });
  await flush();
  assert.equal(created, 1);

  const win = new BrowserWindow();
  stub.emit('activate');
  await flush();
  assert.equal(created, 1);

  win.destroy();
  stub.emit('activate');
  await flush();
  assert.equal(created, 2);
  ctl.dispose();
});

test('window-all-closed 按配置退出', () => {
  stub.reset();
  const keep = setupApp({ quitOnAllWindowsClosed: false });
  stub.emit('window-all-closed');
  assert.equal(stub.quitCalls, 0);
  keep.dispose();

  const close = setupApp({ quitOnAllWindowsClosed: true });
  stub.emit('window-all-closed');
  assert.equal(stub.quitCalls, 1);
  assert.ok(stub.quitted);
  close.dispose();
});

test('优雅退出: 依次执行清理任务后再真正退出', async () => {
  stub.reset();
  const order: string[] = [];
  const ctl = setupApp({
    beforeQuit: [
      async () => {
        await flush();
        order.push('tray');
      },
      () => order.push('windows'),
    ],
  });
  const off = ctl.onBeforeQuit(() => order.push('removed'));
  ctl.onBeforeQuit(() => order.push('extra'));
  off();

  assert.ok(!ctl.isQuitting);
  ctl.quit();
  assert.ok(ctl.isQuitting);
  assert.ok(!stub.quitted);

  // 清理期间再次触发退出不会重复执行
  stub.quit();
  await flush();
  await flush();

  assert.deepEqual(order, ['tray', 'windows', 'extra']);
  assert.ok(stub.quitted);
  ctl.dispose();
});

test('清理任务出错或超时不阻塞退出', async () => {
  stub.reset();
  const errors: AppErrorPhase[] = [];
  const ctl = setupApp({
    quitTimeout: 20,
    onError: (_error, phase) => errors.push(phase),
    beforeQuit: [
      () => {
        throw new Error('boom');
      },
      () => new Promise(() => {}),
    ],
  });

  ctl.quit();
  await new Promise((resolve) => setTimeout(resolve, 40));

  assert.ok(stub.quitted);
  assert.deepEqual(errors, ['quit', 'quit']);
  ctl.dispose();
});

test('没有清理任务时直接放行退出', () => {
  stub.reset();
  const ctl = setupApp();
  ctl.quit();
  assert.ok(stub.quitted);
  assert.equal(stub.quitCalls, 1);
  ctl.dispose();
});

test('onReady 出错交给 onError, 仍继续创建主窗口', async () => {
  stub.reset();
  const errors: AppErrorPhase[] = [];
  let created = 0;
  const ctl = setupApp({
    onReady: () => {
      throw new Error('boom');
    },
    createMainWindow: () => created++,
    onError: (_error, phase) => errors.push(phase),
  });
  await flush();
  assert.deepEqual(errors, ['ready']);
  assert.equal(created, 1);
  ctl.dispose();
});

test('协议工具函数', () => {
  assert.deepEqual(normalizeSchemes(['MyApp', 'myapp://', 'b:']), ['myapp', 'b']);
  assert.deepEqual(normalizeSchemes(undefined), []);
  assert.deepEqual(extractUrls(['a', 'myapp://x', 'MYAPP:y'], ['myapp']), ['myapp://x', 'MYAPP:y']);
  assert.deepEqual(extractUrls(['myapp://x'], []), []);
});
