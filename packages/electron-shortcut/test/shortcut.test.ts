import assert from 'node:assert/strict';
import { test } from 'node:test';

import { BrowserWindow, app, globalShortcut } from 'electron';

import { ShortcutError, createShortcutManager, shortcuts } from '../src/index';
import type { ShortcutContext } from '../src/index';

/** 替身上的测试辅助方法 */
const keys = globalShortcut as typeof globalShortcut & {
  press: (accelerator: string) => boolean;
  keys: () => string[];
  occupy: (accelerator: string) => void;
  reset: () => void;
};
const stubApp = app as typeof app & {
  setNotReady: () => void;
  markReady: () => Promise<void>;
  listenerCount: (event: string) => number;
};

function setup() {
  keys.reset();
  return createShortcutManager();
}

test('注册后按键触发回调, 上下文带名称与组合', () => {
  keys.reset();
  const calls: ShortcutContext[] = [];
  const toggle = shortcuts.register({
    name: 'toggle',
    accelerator: 'CmdOrCtrl+Shift+K',
    handler: (ctx) => calls.push(ctx),
  });

  assert.ok(toggle.registered);
  assert.equal(toggle.scope, 'global');
  assert.equal(shortcuts.get('toggle'), toggle);
  assert.equal(shortcuts.ownerOf('cmdorctrl + shift + k'), 'toggle');
  assert.ok(shortcuts.isRegistered('CmdOrCtrl+Shift+K'));

  assert.ok(keys.press('CmdOrCtrl+Shift+K'));
  assert.equal(calls.length, 1);
  assert.equal(calls[0].name, 'toggle');
  assert.equal(calls[0].accelerator, 'CmdOrCtrl+Shift+K');
  assert.equal(calls[0].shortcut, toggle);

  shortcuts.unregisterAll();
  assert.equal(shortcuts.size, 0);
  assert.deepEqual(keys.keys(), []);
});

test('多个组合任一触发, 部分失败时整体回滚', () => {
  const shortcuts = setup();
  let count = 0;
  const reload = shortcuts.register({
    name: 'reload',
    accelerator: ['F5', 'CmdOrCtrl+R'],
    handler: () => count++,
  });
  keys.press('F5');
  keys.press('CmdOrCtrl+R');
  assert.equal(count, 2);
  assert.deepEqual(reload.accelerator, ['F5', 'CmdOrCtrl+R']);

  keys.occupy('Alt+2');
  assert.throws(
    () => shortcuts.register({ name: 'other', accelerator: ['Alt+1', 'Alt+2'], handler() {} }),
    (error: unknown) =>
      error instanceof ShortcutError &&
      error.reason === 'occupied' &&
      error.accelerator === 'Alt+2',
  );
  // Alt+1 已回滚, 失败的快捷键不会留在管理器里
  assert.ok(!keys.keys().includes('Alt+1'));
  assert.ok(!shortcuts.has('other'));
});

test('被其他应用占用 / 写法非法 / 本应用重复时给出明确错误', () => {
  const shortcuts = setup();
  keys.occupy('Alt+Space');

  assert.throws(
    () => shortcuts.register({ name: 'a', accelerator: 'Alt+Space', handler() {} }),
    /快捷键 "a" 注册 Alt\+Space 失败: 已被其他应用或系统占用/,
  );
  assert.throws(
    () => shortcuts.register({ name: 'b', accelerator: 'Invalid+X', handler() {} }),
    (error: unknown) => error instanceof ShortcutError && error.reason === 'invalid',
  );

  shortcuts.register({ name: 'c', accelerator: 'Alt+C', handler() {} });
  assert.throws(
    () => shortcuts.register({ name: 'd', accelerator: 'alt+c', handler() {} }),
    (error: unknown) =>
      error instanceof ShortcutError && error.reason === 'duplicate' && error.owner === 'c',
  );
  assert.throws(
    () => shortcuts.register({ name: 'e', accelerator: [], handler() {} }),
    /accelerator 不能为空/,
  );
});

test('传 onError 时不抛错, 改为回调', () => {
  const shortcuts = setup();
  keys.occupy('Alt+Space');
  const errors: ShortcutError[] = [];

  const sc = shortcuts.register({
    name: 'a',
    accelerator: 'Alt+Space',
    handler() {},
    onError: (error) => errors.push(error),
  });

  assert.equal(errors.length, 1);
  assert.equal(errors[0].reason, 'occupied');
  assert.ok(!sc.registered);
  assert.ok(shortcuts.has('a'));
});

test('同名冲突策略: recreate (默认) / reuse / error', () => {
  const shortcuts = setup();
  const first = shortcuts.register({ name: 'a', accelerator: 'Alt+A', handler() {} });

  const reused = shortcuts.register({
    name: 'a',
    accelerator: 'Alt+B',
    handler() {},
    conflict: 'reuse',
  });
  assert.equal(reused, first);
  assert.deepEqual(keys.keys(), ['Alt+A']);

  assert.throws(
    () => shortcuts.register({ name: 'a', accelerator: 'Alt+B', handler() {}, conflict: 'error' }),
    /快捷键 "a" 已存在/,
  );

  const second = shortcuts.register({ name: 'a', accelerator: 'Alt+B', handler() {} });
  assert.notEqual(second, first);
  assert.ok(first.disposed);
  assert.deepEqual(keys.keys(), ['Alt+B']);
});

test('响应式句柄: 改 accelerator 换绑, 失败回滚; enabled 启停', () => {
  const shortcuts = setup();
  let hits = 0;
  const sc = shortcuts.register({ name: 'a', accelerator: 'Alt+A', handler: () => hits++ });

  sc.accelerator = 'Alt+B';
  assert.deepEqual(keys.keys(), ['Alt+B']);
  keys.press('Alt+B');
  assert.equal(hits, 1);

  keys.occupy('Alt+X');
  assert.throws(() => {
    sc.accelerator = 'Alt+X';
  }, ShortcutError);
  assert.deepEqual(sc.accelerator, ['Alt+B']);
  assert.deepEqual(keys.keys(), ['Alt+B']);

  sc.enabled = false;
  assert.ok(!sc.registered);
  assert.deepEqual(keys.keys(), []);
  // 停用期间换绑只记录, 不注册
  assert.ok(shortcuts.setAccelerator('a', 'Alt+C'));
  assert.deepEqual(keys.keys(), []);

  assert.ok(shortcuts.enable('a'));
  assert.deepEqual(keys.keys(), ['Alt+C']);

  sc.handler = () => (hits += 10);
  keys.press('Alt+C');
  assert.equal(hits, 11);

  assert.ok(shortcuts.disable('a'));
  assert.ok(!sc.enabled);
  assert.ok(!shortcuts.enable('nope'));
});

test('enabled: false 时注册但不生效', () => {
  const shortcuts = setup();
  const sc = shortcuts.register({ name: 'a', accelerator: 'Alt+A', handler() {}, enabled: false });
  assert.ok(shortcuts.has('a'));
  assert.ok(!sc.registered);
  sc.enable();
  assert.ok(sc.registered);
});

test('scope: focused 随应用窗口焦点注册与注销', () => {
  const shortcuts = setup();
  const win = new BrowserWindow();
  const sc = shortcuts.register({
    name: 'find',
    accelerator: 'CmdOrCtrl+F',
    scope: 'focused',
    handler() {},
  });

  assert.ok(!sc.registered);
  win.focus();
  assert.ok(sc.registered);
  win.blur();
  assert.ok(!sc.registered);

  shortcuts.unregisterAll();
});

test('绑定窗口: 仅该窗口聚焦时生效, 同一组合可在不同窗口间交接', () => {
  const shortcuts = setup();
  const editor = new BrowserWindow();
  const preview = new BrowserWindow();
  const hits: string[] = [];

  shortcuts.register({
    name: 'save',
    accelerator: 'CmdOrCtrl+S',
    window: editor,
    handler: () => hits.push('save'),
  });
  shortcuts.register({
    name: 'export',
    accelerator: 'CmdOrCtrl+S',
    window: () => preview,
    handler: () => hits.push('export'),
  });
  assert.equal(shortcuts.get('save')!.scope, 'focused');

  editor.focus();
  keys.press('CmdOrCtrl+S');
  preview.focus();
  keys.press('CmdOrCtrl+S');
  assert.deepEqual(hits, ['save', 'export']);
  assert.equal(shortcuts.ownerOf('CmdOrCtrl+S'), 'export');

  preview.blur();
  assert.deepEqual(keys.keys(), []);

  shortcuts.unregisterAll();
});

test('绑定的窗口实例关闭后自动注销', () => {
  const shortcuts = setup();
  const win = new BrowserWindow();
  win.focus();
  const sc = shortcuts.register({ name: 'a', accelerator: 'Alt+A', window: win, handler() {} });
  assert.ok(sc.registered);

  win.close();
  assert.ok(sc.disposed);
  assert.ok(!shortcuts.has('a'));
  assert.deepEqual(keys.keys(), []);
});

test('焦点切换时的注册失败走 onError, 不抛到事件循环', () => {
  const shortcuts = setup();
  const win = new BrowserWindow();
  keys.occupy('Alt+A');
  const errors: ShortcutError[] = [];
  shortcuts.register({
    name: 'a',
    accelerator: 'Alt+A',
    scope: 'focused',
    handler() {},
    onError: (error) => errors.push(error),
  });

  assert.doesNotThrow(() => win.focus());
  assert.equal(errors.length, 1);
  win.blur();
  shortcuts.unregisterAll();
});

test('suspend / resume 暂停与恢复全部快捷键', () => {
  const shortcuts = setup();
  shortcuts.register({ name: 'a', accelerator: 'Alt+A', handler() {} });
  shortcuts.register({ name: 'b', accelerator: 'Alt+B', handler() {} });

  shortcuts.suspend();
  assert.ok(shortcuts.suspended);
  assert.deepEqual(keys.keys(), []);
  assert.ok(shortcuts.get('a')!.enabled);

  shortcuts.resume();
  assert.deepEqual(keys.keys().toSorted(), ['Alt+A', 'Alt+B']);
  shortcuts.unregisterAll();
});

test('应用未 ready 时延后到 ready 再注册', async () => {
  const shortcuts = setup();
  stubApp.setNotReady();
  const sc = shortcuts.register({ name: 'a', accelerator: 'Alt+A', handler() {} });
  assert.ok(!sc.registered);

  await stubApp.markReady();
  assert.ok(sc.registered);
  shortcuts.unregisterAll();
});

test('will-quit 时注销全部快捷键', () => {
  const shortcuts = setup();
  shortcuts.register({ name: 'a', accelerator: 'Alt+A', handler() {} });
  app.emit('will-quit');
  assert.deepEqual(keys.keys(), []);
  assert.ok(shortcuts.has('a'));
  shortcuts.unregisterAll();
});

test('全部注销后移除 app 监听', () => {
  const shortcuts = setup();
  const before = stubApp.listenerCount('will-quit');
  shortcuts.register({ name: 'a', accelerator: 'Alt+A', handler() {} });
  assert.equal(stubApp.listenerCount('will-quit'), before + 1);

  assert.ok(shortcuts.unregister('a'));
  assert.ok(!shortcuts.unregister('a'));
  assert.equal(stubApp.listenerCount('will-quit'), before);
  assert.throws(() => shortcuts.getOrThrow('a'), /快捷键 "a" 不存在/);
});
