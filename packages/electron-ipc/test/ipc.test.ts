import assert from 'node:assert/strict';
import { join } from 'node:path';
import { beforeEach, test } from 'node:test';

import { BrowserWindow, ipcMain } from 'electron';

import { EventKeys, Ipc, IpcFileOptions, IpcWindowOptions } from '../src/index';

const W = EventKeys.WindowOptionsKey;
const F = EventKeys.FileOptionsKey;
/** 业务方挂在同名通道上的监听 */
const own = () => {};

beforeEach(() => {
  Ipc.destroy();
  ipcMain.reset();
  BrowserWindow.all = [];
});

test('init 幂等, 重复调用不会重复注册', () => {
  Ipc.init();
  Ipc.init();
  assert.equal(Ipc.initialized, true);
  assert.equal(ipcMain.listeners.get(W)?.length, 1);
  assert.equal(ipcMain.handlers.has(F), true);
});

test('destroy 后可再次 init, 且不移除业务方的同名监听', () => {
  ipcMain.on(W, own);
  Ipc.init();
  Ipc.destroy();
  assert.equal(Ipc.initialized, false);
  assert.deepEqual(ipcMain.listeners.get(W), [own]);
  assert.equal(ipcMain.handlers.has(F), false);

  Ipc.init();
  assert.equal(ipcMain.listeners.get(W)?.length, 2);
});

test('窗口操作只作用于发起调用的窗口', () => {
  Ipc.init();
  const a = new BrowserWindow();
  const b = new BrowserWindow();

  ipcMain.emit(W, a.webContents, IpcWindowOptions.SET_TITLE, '标题 A');
  ipcMain.emit(W, a.webContents, IpcWindowOptions.MAXIMIZE);

  assert.equal(a.title, '标题 A');
  assert.equal(a.maximized, true);
  assert.equal(b.title, '');
  assert.equal(b.maximized, false);
});

test('切换类操作来回切换', () => {
  Ipc.init();
  const win = new BrowserWindow();
  const send = (type: IpcWindowOptions) => ipcMain.emit(W, win.webContents, type);

  send(IpcWindowOptions.SWITCH_MAX);
  assert.equal(win.maximized, true);
  send(IpcWindowOptions.SWITCH_MAX);
  assert.equal(win.maximized, false);

  send(IpcWindowOptions.SWITCH_FULL);
  assert.equal(win.fullScreen, true);

  send(IpcWindowOptions.SWITCH_ALWAYS_ON_TOP);
  assert.equal(win.alwaysOnTop, true);

  send(IpcWindowOptions.SWITCH_FOCUS);
  assert.equal(win.focused, true);
  send(IpcWindowOptions.SWITCH_FOCUS);
  assert.equal(win.focused, false);
});

test('未知操作 / 原型链键 / 已销毁窗口被忽略', () => {
  Ipc.init();
  const win = new BrowserWindow();

  assert.doesNotThrow(() => ipcMain.emit(W, win.webContents, 'not-exist'));
  assert.doesNotThrow(() => ipcMain.emit(W, win.webContents, 'toString'));
  assert.doesNotThrow(() => ipcMain.emit(W, win.webContents, '__proto__'));

  win.destroy();
  ipcMain.emit(W, win.webContents, IpcWindowOptions.SHOW);
  assert.deepEqual(win.calls, []);
});

test('路径操作与 node:path 一致', async () => {
  Ipc.init();
  const sender = new BrowserWindow().webContents;

  assert.equal(await ipcMain.invoke(F, sender, IpcFileOptions.JOIN, '/a', 'b'), join('/a', 'b'));
  assert.equal(await ipcMain.invoke(F, sender, IpcFileOptions.BASENAME, '/a/b.txt', '.txt'), 'b');
  assert.equal(await ipcMain.invoke(F, sender, IpcFileOptions.EXTNAME, '/a/b.txt'), '.txt');
  assert.deepEqual(await ipcMain.invoke(F, sender, IpcFileOptions.PARSE, '/a/b.txt'), {
    root: '/',
    dir: '/a',
    base: 'b.txt',
    ext: '.txt',
    name: 'b',
  });
});

test('未知路径操作抛错', async () => {
  Ipc.init();
  const sender = new BrowserWindow().webContents;

  await assert.rejects(ipcMain.invoke(F, sender, 'nope'), /未知的路径操作/);
  await assert.rejects(ipcMain.invoke(F, sender, 'constructor'), /未知的路径操作/);
});

test('默认拒绝子 frame 与已失效 frame 的调用', async () => {
  Ipc.init();
  const win = new BrowserWindow();
  const main = win.webContents.frame;

  win.webContents.frame = { url: 'https://ads.example.com', parent: main };
  ipcMain.emit(W, win.webContents, IpcWindowOptions.DESTROY);
  assert.equal(win.destroyed, false);
  await assert.rejects(ipcMain.invoke(F, win.webContents, 'join', 'a'), /来源未通过校验/);

  win.webContents.frame = null;
  ipcMain.emit(W, win.webContents, IpcWindowOptions.DESTROY);
  assert.equal(win.destroyed, false);

  win.webContents.frame = main;
  ipcMain.emit(W, win.webContents, IpcWindowOptions.DESTROY);
  assert.equal(win.destroyed, true);
});

test('allowedOrigins 限定主 frame 来源, file:// 按协议匹配', async () => {
  Ipc.init({ allowedOrigins: ['file://', 'http://localhost:5173'] });
  const sender = new BrowserWindow().webContents;

  assert.equal(await ipcMain.invoke(F, sender, 'join', 'a'), 'a');
  sender.frame = { url: 'http://localhost:5173/#/home', parent: null };
  assert.equal(await ipcMain.invoke(F, sender, 'join', 'a'), 'a');
  sender.frame = { url: 'https://evil.example.com', parent: null };
  await assert.rejects(ipcMain.invoke(F, sender, 'join', 'a'), /来源未通过校验/);
});

test('validateSender 替代默认校验, 重复 init 以首次选项为准', async () => {
  Ipc.init({ validateSender: (event) => event.sender.id === 2 });
  Ipc.init({ validateSender: () => true });
  const a = new BrowserWindow();
  const b = new BrowserWindow();
  b.webContents.frame = { url: 'https://x.y', parent: a.webContents.frame };

  await assert.rejects(ipcMain.invoke(F, a.webContents, 'join', 'a'), /来源未通过校验/);
  assert.equal(await ipcMain.invoke(F, b.webContents, 'join', 'a'), 'a');
});
