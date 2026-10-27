import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';

import { exposed, ipcRenderer } from 'electron';

import { $clipboard } from '../src/clipboard';
import { createMatcher, DEFAULT_CONFIG, decodeConfig, encodeConfig } from '../src/config';
import { createIpc } from '../src/ipcRenderer';
import '../src/index';

const $ipc = createIpc({
  channels: { send: ['ch', 'app:*'], invoke: ['ch'], on: ['ch', 'other'] },
  clipboard: false,
});

/** 其他预加载代码直接挂在 ipcRenderer 上的监听 */
const own = () => {};

beforeEach(() => {
  ipcRenderer.removeAllListeners();
  ipcRenderer.sent = [];
});

test('默认只暴露 $ipc / $webFrame, 不暴露 $clipboard', () => {
  assert.deepEqual(Object.keys(exposed).toSorted(), ['$ipc', '$webFrame']);
});

test('默认白名单只放行 electron-ipc 内置通道', async () => {
  const ipc = exposed.$ipc;
  ipc.send('__window_options__', 'maximize');
  assert.deepEqual(ipcRenderer.sent, [['__window_options__', 'maximize']]);
  assert.deepEqual(await ipc.invoke('__file_options__', 'join', 'a'), {
    channel: '__file_options__',
    args: ['join', 'a'],
  });

  assert.throws(() => ipc.send('custom'), /未在 send 白名单中/);
  assert.throws(() => ipc.on('custom', () => {}), /未在 on 白名单中/);
  await assert.rejects(ipc.invoke('custom'), /未在 invoke 白名单中/);
});

test('配置经命令行参数往返, 损坏或缺失时回落到默认值', () => {
  const config = { channels: { send: ['a'], invoke: ['b:*'], on: [] }, clipboard: true };
  assert.deepEqual(decodeConfig(['electron', encodeConfig(config)]), config);
  assert.deepEqual(decodeConfig(['electron']), DEFAULT_CONFIG);
  assert.deepEqual(decodeConfig(['--quiteer-preload=%7Bbad']), DEFAULT_CONFIG);
  // 非字符串条目与非 true 的 clipboard 被丢弃
  assert.deepEqual(
    decodeConfig([
      encodeConfig({ channels: { send: ['a', 1], on: 'x' }, clipboard: 'yes' } as any),
    ]),
    { channels: { send: ['a'], invoke: [], on: [] }, clipboard: false },
  );
});

test('白名单支持 * 结尾的前缀匹配', () => {
  const allowed = createMatcher(['exact', 'user:*']);
  assert.equal(allowed('exact'), true);
  assert.equal(allowed('exact2'), false);
  assert.equal(allowed('user:get'), true);
  assert.equal(allowed('users'), false);
  assert.equal(allowed(1), false);
});

test('send / invoke / sendSync 在白名单内原样转发', async () => {
  $ipc.send('ch', 1, 'a');
  $ipc.send('app:quit');
  assert.deepEqual(ipcRenderer.sent, [['ch', 1, 'a'], ['app:quit']]);
  assert.deepEqual(await $ipc.invoke('ch', 2), { channel: 'ch', args: [2] });
  assert.deepEqual($ipc.sendSync('ch', 3), { channel: 'ch', args: [3] });
  assert.throws(() => $ipc.sendSync('nope'), /白名单/);
});

test('on 回调拿不到 ipcRenderer, 参数位置保持不变', () => {
  const calls: unknown[][] = [];
  $ipc.on('ch', (...args: unknown[]) => calls.push(args));

  ipcRenderer.push('ch', 'x', 1);

  assert.equal(calls.length, 1);
  const [event, ...rest] = calls[0];
  assert.deepEqual(event, {});
  assert.deepEqual(rest, ['x', 1]);
});

test('on 返回的函数可取消监听', () => {
  let count = 0;
  const off = $ipc.on('ch', () => count++);

  ipcRenderer.push('ch');
  off();
  ipcRenderer.push('ch');

  assert.equal(count, 1);
  assert.equal(ipcRenderer.listenerCount('ch'), 0);
});

test('once 只触发一次, 提前取消也生效', () => {
  let count = 0;
  $ipc.once('ch', () => count++);
  ipcRenderer.push('ch');
  ipcRenderer.push('ch');
  assert.equal(count, 1);
  assert.equal(ipcRenderer.listenerCount('ch'), 0);

  const off = $ipc.once('other', () => count++);
  off();
  ipcRenderer.push('other');
  assert.equal(count, 1);
});

test('removeAllListeners 只移除经 $ipc 注册的监听', () => {
  ipcRenderer.on('ch', own);
  $ipc.on('ch', () => {});
  $ipc.on('other', () => {});

  assert.equal($ipc.removeAllListeners('ch'), undefined);
  assert.deepEqual(ipcRenderer.listeners('ch'), [own]);
  assert.equal(ipcRenderer.listenerCount('other'), 1);

  $ipc.removeAllListeners();
  assert.equal(ipcRenderer.listenerCount('other'), 0);
  assert.deepEqual(ipcRenderer.listeners('ch'), [own]);
});

test('$clipboard 经内部通道转发到主进程, type 放在方法名之后', async () => {
  assert.deepEqual(await $clipboard.writeText('hello', 'selection'), {
    channel: '__preload_clipboard__',
    args: ['writeText', 'selection', 'hello'],
  });
  assert.deepEqual(await $clipboard.clear(), {
    channel: '__preload_clipboard__',
    args: ['clear', undefined],
  });
});

test('$webFrame 只保留缩放等安全能力', () => {
  const frame = exposed.$webFrame;
  assert.deepEqual(Object.keys(frame).toSorted(), [
    'clearCache',
    'getResourceUsage',
    'getZoomFactor',
    'getZoomLevel',
    'insertText',
    'setZoomFactor',
    'setZoomLevel',
  ]);
  frame.setZoomFactor(1.5);
  assert.equal(frame.getZoomFactor(), 1.5);
});
