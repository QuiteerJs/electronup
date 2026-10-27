/**
 * 契约类型用例: 只参与类型检查, 不参与运行
 */
import { BrowserWindow } from 'electron';

import { createEmitter, handleContract } from '../src/index';
import type { StandardSchemaV1 } from '../src/web';
import { channel, createClient, defineContract } from '../src/web';

interface User {
  id: string;
  name: string;
}

const api = defineContract({
  invoke: {
    'user:get': channel<(id: string) => User>(),
    'user:list': channel<() => User[]>(),
  },
  send: { 'app:log': channel<(msg: string, level?: 'info' | 'warn') => void>() },
  on: { 'download:progress': channel<(percent: number) => void>() },
});

// ---------- 主进程 ----------

handleContract(api, {
  invoke: {
    'user:get': (ctx, id) => ({ id, name: ctx.sender.id.toString() }),
    // 允许返回 Promise
    'user:list': async () => [],
  },
  send: { 'app:log': (_ctx, _msg, _level) => {} },
});

handleContract(api, {
  // @ts-expect-error 漏实现 user:list
  invoke: { 'user:get': (_ctx, id) => ({ id, name: '' }) },
  send: { 'app:log': () => {} },
});

handleContract(api, {
  invoke: {
    // @ts-expect-error 返回值与契约不符
    'user:get': () => 1,
    'user:list': () => [],
  },
  send: { 'app:log': () => {} },
});

// 契约里没有 send 组时可以不写
const invokeOnly = defineContract({ invoke: { ping: channel<() => 'pong'>() } });
handleContract(invokeOnly, { invoke: { ping: () => 'pong' } });

const emitter = createEmitter(api);
declare const win: BrowserWindow;
emitter.emit(win, 'download:progress', 0.5);
emitter.broadcast('download:progress', 1);
// @ts-expect-error 参数类型错误
emitter.emit(win, 'download:progress', '50%');
// @ts-expect-error 渲染层 → 主进程的通道不能用来推送
emitter.broadcast('app:log', 'x');

// ---------- 渲染层 ----------

const client = createClient(api);

export const user: Promise<User> = client.invoke('user:get', '1');
export const users: Promise<User[]> = client.invoke('user:list');
client.send('app:log', 'hi');
client.send('app:log', 'hi', 'warn');
client.on('download:progress', (percent: number) => percent.toFixed());

// @ts-expect-error 未知通道
void client.invoke('user:delete', '1');
// @ts-expect-error 漏传参数
void client.invoke('user:get');
// @ts-expect-error 参数类型错误
client.send('app:log', 1);
// @ts-expect-error send 通道不能 invoke
void client.invoke('app:log', 'x');
// @ts-expect-error 回调参数类型错误
client.on('download:progress', (percent: string) => percent);

// ---------- 参数 schema 必须与签名一致 ----------

declare const stringTuple: StandardSchemaV1<unknown, [string]>;
channel<(id: string) => User>({ args: stringTuple });
// @ts-expect-error schema 输出与签名参数不符
channel<(id: number) => User>({ args: stringTuple });
