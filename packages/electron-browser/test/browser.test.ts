import assert from 'node:assert/strict';
import { test } from 'node:test';

import { BrowserWindow } from 'electron';

import { WinStore, createWindowManager, toController, windows } from '../src/index';

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
