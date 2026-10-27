import assert from 'node:assert/strict';
import { beforeEach, test } from 'node:test';

import { clipboard, exposed, ipcRenderer } from 'electron';

import '../src/index';

const $ipc = exposed.$ipc;

beforeEach(() => {
  ipcRenderer.removeAllListeners();
  ipcRenderer.sent = [];
});

test('三组 API 均已暴露到渲染层', () => {
  assert.deepEqual(Object.keys(exposed).toSorted(), ['$clipboard', '$ipc', '$webFrame']);
});

test('send / invoke / sendSync 原样转发', async () => {
  $ipc.send('ch', 1, 'a');
  assert.deepEqual(ipcRenderer.sent, [['ch', 1, 'a']]);
  assert.deepEqual(await $ipc.invoke('ch', 2), { channel: 'ch', args: [2] });
  assert.deepEqual($ipc.sendSync('ch', 3), { channel: 'ch', args: [3] });
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

  const off = $ipc.once('other', () => count++);
  off();
  ipcRenderer.push('other');
  assert.equal(count, 1);
});

test('removeAllListeners 不返回 ipcRenderer', () => {
  $ipc.on('ch', () => {});
  assert.equal($ipc.removeAllListeners('ch'), undefined);
  assert.equal(ipcRenderer.listenerCount('ch'), 0);
});

test('$clipboard / $webFrame 转发到原生对象', async () => {
  await exposed.$clipboard.writeText('hello');
  assert.equal(clipboard.text, 'hello');
  assert.equal(await exposed.$clipboard.readText(), 'hello');

  exposed.$webFrame.setZoomFactor(1.5);
  assert.equal(exposed.$webFrame.getZoomFactor(), 1.5);
  assert.equal(exposed.$webFrame.routingId(), 7);
  assert.equal(exposed.$webFrame.parent(), null);
});
