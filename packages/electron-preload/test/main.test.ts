import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';

import { clipboard, ClipboardItem, ipcMain } from 'electron';

import { decodeConfig } from '../src/config';
import { createPreload, preloadPath, removeClipboardHandler } from '../src/main';

const CH = '__preload_clipboard__';
const call = (method: string, type?: string, ...args: unknown[]) =>
  ipcMain.invoke(CH, undefined, method, type, ...args);

beforeEach(() => {
  removeClipboardHandler();
  clipboard.clear();
  clipboard.selection.clear();
});

test('createPreload 返回可展开进 webPreferences 的字段', () => {
  const prefs = createPreload({ channels: { invoke: ['user:*'], on: ['progress'] } });
  assert.equal(prefs.preload, preloadPath);
  assert.match(preloadPath, /preload\.cjs$/);
  assert.deepEqual(decodeConfig(prefs.additionalArguments), {
    channels: {
      send: ['__window_options__'],
      invoke: ['__file_options__', 'user:*'],
      on: ['progress'],
    },
    clipboard: false,
  });
  assert.equal(ipcMain.handlers.has(CH), false);
});

test('builtinChannels: false 时不放行内置通道', () => {
  const prefs = createPreload({ channels: { send: ['a'] }, builtinChannels: false });
  assert.deepEqual(decodeConfig(prefs.additionalArguments).channels, {
    send: ['a'],
    invoke: [],
    on: [],
  });
});

test('clipboard: true 时注册处理器, 重复调用不报错', () => {
  createPreload({ clipboard: true });
  assert.doesNotThrow(() => createPreload({ clipboard: true }));
  assert.equal(ipcMain.handlers.has(CH), true);
});

test('剪贴板文本读写与 clear, selection 互不影响', async () => {
  createPreload({ clipboard: true });
  await call('writeText', undefined, 'hello');
  await call('writeText', 'selection', 'sel');
  assert.equal(await call('readText'), 'hello');
  assert.equal(await call('readText', 'selection'), 'sel');
  assert.equal(await call('has', undefined, 'text/plain'), true);

  // 修复: clear 之前丢掉了 type 参数
  await call('clear', 'selection');
  assert.equal(await call('readText', 'selection'), '');
  assert.equal(await call('readText'), 'hello');
});

test('read / write 在普通对象与 ClipboardItem 之间转换', async () => {
  createPreload({ clipboard: true });
  const png = new Uint8Array([1, 2, 3]);
  await call('write', undefined, [{ 'text/html': '<b>x</b>', 'image/png': png }]);

  const [item] = clipboard.items;
  assert.ok(item instanceof ClipboardItem);
  const blob = (await item.getType('image/png')) as Blob;
  assert.deepEqual(new Uint8Array(await blob.arrayBuffer()), png);

  clipboard.items = [
    new ClipboardItem({
      'text/plain': new Blob(['hi'], { type: 'text/plain' }),
      'image/png': new Blob([png], { type: 'image/png' }),
      'electron application/bookmark': { title: 't', url: 'https://a.b' },
    }),
  ];
  assert.deepEqual(await call('read'), [
    {
      'text/plain': 'hi',
      'image/png': png,
      'electron application/bookmark': { title: 't', url: 'https://a.b' },
    },
  ]);

  await assert.rejects(call('write', undefined, 'not-array'), /需要传入数组/);
});

test('拒绝子 frame、未知操作与原型链键', async () => {
  createPreload({ clipboard: true });
  await assert.rejects(
    ipcMain.invoke(CH, { parent: { parent: null } }, 'readText'),
    /只允许主 frame/,
  );
  await assert.rejects(ipcMain.invoke(CH, null, 'readText'), /只允许主 frame/);
  await assert.rejects(call('toString'), /未知的剪贴板操作/);
  await assert.rejects(call('nope'), /未知的剪贴板操作/);
});
