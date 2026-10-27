import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';

import { BrowserWindow, ipcMain, WebContents } from 'electron';

import {
  builtinChannels,
  channel,
  channelsOf,
  createEmitter,
  defineContract,
  handleContract,
} from '../src/index';
import type { IpcBridge, StandardSchemaV1 } from '../src/web';
import { createClient } from '../src/web';

/** 最小 Standard Schema: 要求参数是一个字符串 */
const oneString: StandardSchemaV1<unknown, [string]> = {
  '~standard': {
    version: 1,
    vendor: 'test',
    validate: (value) =>
      Array.isArray(value) && value.length === 1 && typeof value[0] === 'string'
        ? { value: [value[0].trim()] as [string] }
        : { issues: [{ message: '需要一个字符串' }] },
  },
};

const api = defineContract({
  invoke: {
    'user:get': channel<(id: string) => { id: string; name: string }>(),
    'user:rename': channel<(name: string) => string>({ args: oneString }),
  },
  send: {
    'app:log': channel<(msg: string) => void>(),
  },
  on: {
    'download:progress': channel<(percent: number) => void>(),
  },
});

const logs: unknown[][] = [];
const handlers = {
  invoke: {
    'user:get': (_ctx: unknown, id: string) => ({ id, name: `user-${id}` }),
    'user:rename': async (_ctx: unknown, name: string) => name.toUpperCase(),
  },
  send: {
    'app:log': (ctx: { window: BrowserWindow | null }, msg: string) => {
      logs.push([ctx.window, msg]);
    },
  },
};

beforeEach(() => {
  ipcMain.reset();
  BrowserWindow.all = [];
  WebContents.all = [];
  logs.length = 0;
});

test('契约生成 preload 白名单, 可与内置通道合并去重', () => {
  assert.deepEqual(api.channels, {
    invoke: ['user:get', 'user:rename'],
    send: ['app:log'],
    on: ['download:progress'],
  });
  assert.deepEqual(channelsOf(api, builtinChannels, api), {
    invoke: ['user:get', 'user:rename', '__file_options__'],
    send: ['app:log', '__window_options__'],
    on: ['download:progress'],
  });
  assert.ok(Object.isFrozen(api.channels.invoke));
});

test('handleContract 注册 invoke / send, ctx 带发起窗口', async () => {
  handleContract(api, handlers);
  const win = new BrowserWindow();

  assert.deepEqual(await ipcMain.invoke('user:get', win.webContents, '7'), {
    id: '7',
    name: 'user-7',
  });

  ipcMain.emit('app:log', win.webContents, 'hello');
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(logs, [[win, 'hello']]);
});

test('参数校验: 通过时 handler 拿到校验后的值, 失败时 invoke 拒绝', async () => {
  handleContract(api, handlers);
  const sender = new BrowserWindow().webContents;

  assert.equal(await ipcMain.invoke('user:rename', sender, '  bob '), 'BOB');
  await assert.rejects(ipcMain.invoke('user:rename', sender, 1), /参数校验失败: 需要一个字符串/);
});

test('默认只接受顶层 frame, 可通过 validateSender 放开', async () => {
  const sender = new BrowserWindow().webContents;
  const iframe = { parent: sender.mainFrame };

  const dispose = handleContract(api, handlers);
  await assert.rejects(ipcMain.invokeFrom(iframe, 'user:get', sender, '1'), /不可信 frame/);
  await assert.rejects(ipcMain.invokeFrom(null, 'user:get', sender, '1'), /不可信 frame/);
  ipcMain.emitFrom(iframe, 'app:log', sender, 'x');
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(logs, []);
  dispose();

  handleContract(api, handlers, { validateSender: () => true });
  assert.deepEqual(await ipcMain.invokeFrom(iframe, 'user:get', sender, '1'), {
    id: '1',
    name: 'user-1',
  });
});

test('dispose 注销全部通道; 漏实现或通道冲突时不留下半注册状态', () => {
  const dispose = handleContract(api, handlers);
  dispose();
  assert.equal(ipcMain.handlers.size, 0);
  assert.deepEqual(ipcMain.listeners.get('app:log'), []);

  assert.throws(
    () =>
      handleContract(api, {
        ...handlers,
        invoke: { 'user:get': handlers.invoke['user:get'] },
      } as never),
    /user:rename 未实现处理函数/,
  );
  assert.equal(ipcMain.handlers.size, 0);

  ipcMain.handle('user:rename', () => 'taken');
  assert.throws(() => handleContract(api, handlers), /second handler/);
  assert.deepEqual([...ipcMain.handlers.keys()], ['user:rename']);
  assert.deepEqual(ipcMain.listeners.get('app:log') ?? [], []);
});

test('createEmitter 按契约推送, 跳过已销毁的 webContents', () => {
  const emitter = createEmitter(api);
  const a = new BrowserWindow();
  const b = new BrowserWindow();

  emitter.emit(a, 'download:progress', 0.5);
  assert.deepEqual(a.webContents.sent, [['download:progress', 0.5]]);

  b.webContents.destroyed = true;
  emitter.broadcast('download:progress', 1);
  assert.deepEqual(a.webContents.sent.at(-1), ['download:progress', 1]);
  assert.deepEqual(b.webContents.sent, []);

  assert.throws(
    () => (emitter.emit as (target: BrowserWindow, name: string) => void)(a, 'nope'),
    /不存在推送通道/,
  );
});

test('createClient 走 bridge, 去掉 event 参数, 拒绝契约外通道', async () => {
  const calls: unknown[][] = [];
  const pushed = new Map<string, (event: unknown, ...args: any[]) => void>();
  const bridge: IpcBridge = {
    send: (...args) => calls.push(['send', ...args]),
    invoke: async (...args) => calls.push(['invoke', ...args]),
    on: (name, listener) => {
      pushed.set(name, listener);
      return () => pushed.delete(name);
    },
    once: (name, listener) => {
      pushed.set(name, listener);
      return () => pushed.delete(name);
    },
  };
  const client = createClient(api, bridge);

  await client.invoke('user:get', '1');
  client.send('app:log', 'hi');
  assert.deepEqual(calls, [
    ['invoke', 'user:get', '1'],
    ['send', 'app:log', 'hi'],
  ]);

  const received: number[] = [];
  const off = client.on('download:progress', (percent) => received.push(percent));
  pushed.get('download:progress')!({}, 0.3);
  assert.deepEqual(received, [0.3]);
  off();
  assert.equal(pushed.size, 0);

  await assert.rejects(
    (client.invoke as (name: string) => Promise<unknown>)('toString'),
    /不存在 invoke 通道/,
  );
  assert.throws(() => (client.send as (name: string) => void)('__proto__'), /不存在 send 通道/);
});

test('createClient 默认读取 globalThis.$ipc, 缺失时给出明确错误', () => {
  assert.throws(() => createClient(api), /未找到 \$ipc/);
});
