import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

import { BrowserWindow, app, screen, shell } from 'electron';

import {
  SECURE_WEB_PREFERENCES,
  WinStore,
  createFileStateStorage,
  createWindowManager,
  toController,
  windows,
} from '../src/index';
import type { WindowState, WindowStateStorage } from '../src/index';

function memoryStorage(initial: Record<string, WindowState> = {}): WindowStateStorage & {
  data: Record<string, WindowState>;
} {
  const data = { ...initial };
  return { data, get: (key) => data[key], set: (key, state) => void (data[key] = state) };
}

test('创建窗口并按名取到同一实例', () => {
  const main = windows.create({ name: 'main', width: 1200, height: 800 });
  assert.equal(windows.get('main'), main.target);
  assert.ok(windows.has('main'));
  assert.equal(windows.size, 1);
});

test('响应式属性读写同步到真实窗口', () => {
  const main = windows.getController('main')!;
  assert.deepEqual([main.width, main.height], [1200, 800]);

  main.width = 900;
  assert.deepEqual(main.target.getSize(), [900, 800]);

  main.height = 500;
  assert.deepEqual(main.target.getSize(), [900, 500]);

  main.x = 10;
  main.y = 20;
  assert.deepEqual(main.target.getPosition(), [10, 20]);
  assert.deepEqual([main.x, main.y], [10, 20]);

  main.centered = true;
  assert.deepEqual(main.target.getPosition(), [100, 100]);

  main.title = 'demo';
  assert.equal(main.title, 'demo');

  main.visible = false;
  assert.equal(main.visible, false);
  main.visible = true;
  assert.equal(main.visible, true);
});

test('方法与 getter 透传 BrowserWindow', () => {
  const main = windows.getController('main')!;
  main.loadURL('https://example.com');
  assert.equal(main.target.url, 'https://example.com');
  assert.equal(main.id, main.target.id);
});

test('同名重复创建默认聚焦已有窗口', () => {
  const main = windows.getController('main')!;
  const again = windows.create({ name: 'main' });
  assert.equal(again, main);
  assert.equal(windows.size, 1);
  assert.deepEqual(BrowserWindow.focused, [main.target.id]);
});

test('多窗口注册与广播', () => {
  BrowserWindow.sent = [];
  windows.create({ name: 'child', openDevTools: true });
  assert.equal(windows.size, 2);
  assert.equal(BrowserWindow.devtools, 1);

  windows.broadcast('ping', { a: 1 });
  assert.equal(BrowserWindow.sent.length, 2);
});

test('按 id / webContents 反查窗口', () => {
  const child = windows.getController('child')!;
  assert.equal(windows.store.fromWebContents(child.target.webContents), child);
  assert.equal(windows.store.fromWebContents(child.target.webContents.id), child);
  assert.equal(windows.store.fromId(child.target.id), child);
  assert.equal(windows.store.getName(child.target), 'child');
});

test('窗口关闭后自动从仓库摘除', () => {
  windows.get('child')!.close();
  assert.equal(windows.has('child'), false);
  assert.equal(windows.get('child'), undefined);
  assert.equal(windows.size, 1);
});

test('外部创建的窗口可纳入管理', () => {
  const ext = new BrowserWindow({});
  const controller = windows.register('ext', ext);
  assert.equal(windows.get('ext'), ext);
  assert.equal(controller.name, 'ext');

  // 同名覆盖注册后, 旧窗口关闭不应摘除新映射
  const ext2 = new BrowserWindow({});
  windows.register('ext', ext2);
  ext.close();
  assert.equal(windows.get('ext'), ext2);
});

test('缺失窗口 getOrThrow 抛错', () => {
  assert.throws(() => windows.getOrThrow('nope'), /窗口 "nope" 不存在或已销毁/);
});

test('多个 manager 实例互相隔离', () => {
  const typed = createWindowManager<'a' | 'b'>();
  typed.create({ name: 'a' });
  assert.equal(typed.size, 1);
  assert.equal(windows.size, 2);
});

test('WinStore 可独立使用, closeAll 关闭并清空', async () => {
  const store = new WinStore();
  const raw = new BrowserWindow({ width: 100, height: 200 });
  store.register('raw', toController(raw, 'raw'));
  assert.equal(store.list().length, 1);
  assert.deepEqual(store.names(), ['raw']);

  await store.closeAll();
  assert.equal(raw.isDestroyed(), true);
  assert.equal(store.size, 0);
});

test('webPreferences 默认安全配置, 显式传入优先', () => {
  const manager = createWindowManager();
  const win = manager.create({ name: 'secure' }).target as unknown as BrowserWindow;
  assert.deepEqual(win.options.webPreferences, SECURE_WEB_PREFERENCES);

  const loose = manager.create({
    name: 'loose',
    webPreferences: { sandbox: false, preload: '/p.js' },
  }).target as unknown as BrowserWindow;
  assert.deepEqual(loose.options.webPreferences, {
    ...SECURE_WEB_PREFERENCES,
    sandbox: false,
    preload: '/p.js',
  });
});

test('导航守卫: 默认只允许同源跳转', () => {
  const manager = createWindowManager();
  const { webContents } = manager.create({
    name: 'nav',
    url: 'https://app.example.com/index.html',
    navigation: { allowedOrigins: ['https://auth.example.com'] },
  }).target as unknown as BrowserWindow;

  assert.equal(webContents.navigate('https://app.example.com/other'), false);
  assert.equal(webContents.navigate('https://auth.example.com/login'), false);
  assert.equal(webContents.navigate('https://evil.example.com'), true);
  assert.equal(webContents.navigate('not a url'), true);
});

test('导航守卫: file 页面允许本地跳转, 自定义判断与关闭', () => {
  const manager = createWindowManager();
  const local = manager.create({ name: 'local', file: 'index.html' })
    .target as unknown as BrowserWindow;
  assert.equal(local.file, 'index.html');
  assert.equal(local.webContents.navigate('file:///app/about.html'), false);
  assert.equal(local.webContents.navigate('https://example.com'), true);

  const custom = manager.create({
    name: 'custom',
    navigation: { allowNavigation: (url) => url.endsWith('.ok') },
  }).target as unknown as BrowserWindow;
  assert.equal(custom.webContents.navigate('https://a.ok'), false);
  assert.equal(custom.webContents.navigate('https://a.no'), true);

  const off = manager.create({ name: 'off', navigation: false }).target as unknown as BrowserWindow;
  assert.equal(off.webContents.navigate('https://anything.com'), false);
  assert.equal(off.webContents.windowOpenHandler, undefined);
});

test('window.open 默认拒绝, external 交给系统浏览器', () => {
  const manager = createWindowManager();
  const deny = manager.create({ name: 'deny' }).target as unknown as BrowserWindow;
  assert.deepEqual(deny.webContents.windowOpenHandler!({ url: 'https://x.com' }), {
    action: 'deny',
  });

  shell.opened = [];
  const ext = manager.create({ name: 'ext', navigation: { windowOpen: 'external' } })
    .target as unknown as BrowserWindow;
  assert.deepEqual(ext.webContents.windowOpenHandler!({ url: 'https://x.com' }), {
    action: 'deny',
  });
  ext.webContents.windowOpenHandler!({ url: 'javascript:alert(1)' });
  assert.deepEqual(shell.opened, ['https://x.com']);
});

test('url 与 file 不能同时指定', () => {
  assert.throws(
    () => createWindowManager().create({ name: 'both', url: 'https://a.com', file: 'a.html' }),
    /二选一/,
  );
});

test('parent 可按名指定, 缺失时抛错且不影响已有窗口', () => {
  const manager = createWindowManager<'main' | 'dialog'>();
  const main = manager.create({ name: 'main' });
  const dialog = manager.create({ name: 'dialog', parent: 'main', modal: true })
    .target as unknown as BrowserWindow;
  assert.equal(dialog.options.parent, main.target);
  assert.equal(dialog.options.modal, true);

  main.target.close();
  assert.throws(
    () => manager.create({ name: 'dialog', parent: 'main', conflict: 'recreate' }),
    /窗口 "main" 不存在/,
  );
  assert.ok(manager.has('dialog'));
});

test('加载失败交给 onLoadError', async () => {
  const errors: [string, string][] = [];
  BrowserWindow.loadError = new Error('ERR_CONNECTION_REFUSED');
  createWindowManager().create({
    name: 'broken',
    url: 'https://down.example.com',
    onLoadError: (error, controller) => errors.push([error.message, controller.name]),
  });
  BrowserWindow.loadError = undefined;
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(errors, [['ERR_CONNECTION_REFUSED', 'broken']]);
});

test('persistState: 关闭时保存, 下次创建恢复尺寸位置与最大化', () => {
  const storage = memoryStorage();
  const manager = createWindowManager();

  const first = manager.create({
    name: 'editor',
    width: 800,
    height: 600,
    persistState: { storage },
  });
  first.width = 1000;
  first.x = 120;
  first.y = 80;
  first.target.emit('resize');
  first.target.maximize();
  first.target.close();
  assert.deepEqual(storage.data.editor, {
    x: 120,
    y: 80,
    width: 1000,
    height: 600,
    isMaximized: true,
    isFullScreen: false,
  });

  const second = manager.create({
    name: 'editor',
    width: 800,
    height: 600,
    persistState: { storage },
  });
  const win = second.target as unknown as BrowserWindow;
  assert.deepEqual(
    [win.options.x, win.options.y, win.options.width, win.options.height],
    [120, 80, 1000, 600],
  );
  // 要恢复最大化时先隐藏, ready-to-show 后再最大化显示
  assert.equal(win.options.show, false);
  assert.equal(win.isMaximized(), false);
  win.emit('ready-to-show');
  assert.equal(win.isMaximized(), true);
  assert.equal(win.isVisible(), true);
});

test('persistState: 越界位置被修正', () => {
  const manager = createWindowManager();
  const storage = memoryStorage({
    // 外接屏已拔出
    gone: { x: 3000, y: 200, width: 2500, height: 900, isMaximized: false, isFullScreen: false },
    // 部分越出右下角
    edge: { x: 1800, y: 1000, width: 400, height: 300, isMaximized: false, isFullScreen: false },
  });

  const gone = manager.create({ name: 'gone', persistState: { storage } })
    .target as unknown as BrowserWindow;
  assert.deepEqual(
    [gone.options.x, gone.options.y, gone.options.width, gone.options.height],
    [undefined, undefined, 1920, 900],
  );

  const edge = manager.create({ name: 'edge', persistState: { storage } })
    .target as unknown as BrowserWindow;
  assert.deepEqual([edge.options.x, edge.options.y], [1520, 780]);

  // 第二块屏幕上的位置原样保留
  screen.displays.push({ workArea: { x: 1920, y: 0, width: 2560, height: 1440 } });
  storage.data.far = {
    x: 2200,
    y: 200,
    width: 2000,
    height: 900,
    isMaximized: false,
    isFullScreen: false,
  };
  const back = manager.create({ name: 'far', persistState: { storage } })
    .target as unknown as BrowserWindow;
  assert.deepEqual([back.options.x, back.options.width], [2200, 2000]);
  screen.displays.pop();
});

test('文件存储: 写入 userData 并忽略损坏数据', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'electron-browser-'));
  app.userData = dir;
  const file = path.join(dir, 'window-state.json');
  fs.writeFileSync(file, JSON.stringify({ bad: { width: 'x' }, ok: { width: 10, height: 20 } }));

  const storage = createFileStateStorage();
  assert.equal(storage.get('bad'), undefined);
  assert.deepEqual(storage.get('ok'), {
    width: 10,
    height: 20,
    isMaximized: false,
    isFullScreen: false,
  });

  const state = { x: 1, y: 2, width: 3, height: 4, isMaximized: false, isFullScreen: true };
  storage.set('main', state);
  assert.deepEqual(createFileStateStorage(file).get('main'), state);
  fs.rmSync(dir, { recursive: true, force: true });
});
