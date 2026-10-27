import type { IpcRendererEvent } from 'electron';
import { ipcRenderer } from 'electron';

/**
 * 交给渲染层监听回调的事件占位
 *
 * 原生 `IpcRendererEvent.sender` 就是 ipcRenderer 本身, 原样透出等于把整个 ipcRenderer 交给页面,
 * 因此这里只传一个空对象占住第一个参数, 保持 `(event, ...args)` 的回调签名不变
 */
export type PreloadIpcEvent = Record<never, never>;

export type PreloadIpcListener = (event: PreloadIpcEvent, ...args: any[]) => void;

export interface PreloadIpc {
  /** 单向发送 */
  send(channel: string, ...args: unknown[]): void;
  /** 同步发送, 会阻塞渲染进程, 非必要请用 invoke */
  sendSync<R = any>(channel: string, ...args: unknown[]): R;
  /** 双向调用 */
  invoke<R = any>(channel: string, ...args: unknown[]): Promise<R>;
  /** 监听主进程推送, 返回取消监听的函数 */
  on(channel: string, listener: PreloadIpcListener): () => void;
  /** 监听一次, 返回取消监听的函数 */
  once(channel: string, listener: PreloadIpcListener): () => void;
  /** 移除通道上的全部监听, 不传通道则清空全部 */
  removeAllListeners(channel?: string): void;
}

/**
 * 包装监听器, 并返回可取消的句柄
 *
 * 页面传来的函数每次跨越 contextBridge 都会得到新的代理, 无法拿它去 removeListener,
 * 所以取消监听只能靠这里返回的函数
 */
function subscribe(
  method: 'on' | 'once',
  channel: string,
  listener: PreloadIpcListener,
): () => void {
  const wrapped = (_event: IpcRendererEvent, ...args: unknown[]) => listener({}, ...args);
  ipcRenderer[method](channel, wrapped);
  return () => {
    ipcRenderer.removeListener(channel, wrapped);
  };
}

export const $ipc: PreloadIpc = {
  send: (channel, ...args) => ipcRenderer.send(channel, ...args),
  sendSync: (channel, ...args) => ipcRenderer.sendSync(channel, ...args),
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args),
  on: (channel, listener) => subscribe('on', channel, listener),
  once: (channel, listener) => subscribe('once', channel, listener),
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  },
};
