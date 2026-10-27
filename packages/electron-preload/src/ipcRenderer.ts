import type { IpcRendererEvent } from 'electron';
import { ipcRenderer } from 'electron';

import type { PreloadRuntimeConfig } from './config';
import { createMatcher } from './config';

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
  /** 移除经 `$ipc` 注册的监听, 不传通道则清空全部 */
  removeAllListeners(channel?: string): void;
}

function assertAllowed(allowed: (channel: unknown) => boolean, kind: string, channel: unknown) {
  if (!allowed(channel)) {
    throw new Error(
      `[electron-preload] 通道 "${String(channel)}" 未在 ${kind} 白名单中, 请在 createPreload({ channels }) 中声明`,
    );
  }
}

type Wrapped = (event: IpcRendererEvent, ...args: unknown[]) => void;

/** 按白名单生成 `$ipc` */
export function createIpc({ channels }: PreloadRuntimeConfig): PreloadIpc {
  const canSend = createMatcher(channels.send);
  const canInvoke = createMatcher(channels.invoke);
  const canOn = createMatcher(channels.on);

  /**
   * 只记录经 `$ipc` 注册的监听, removeAllListeners 不会误伤其他预加载代码挂的监听
   *
   * 页面传来的函数每次跨越 contextBridge 都会得到新的代理, 无法拿它去 removeListener,
   * 所以取消监听只能靠 on / once 返回的函数
   */
  const registry = new Map<string, Set<Wrapped>>();

  const untrack = (channel: string, wrapped: Wrapped) => {
    ipcRenderer.removeListener(channel, wrapped);
    const set = registry.get(channel);
    set?.delete(wrapped);
    if (set?.size === 0) {
      registry.delete(channel);
    }
  };

  const subscribe = (method: 'on' | 'once', channel: string, listener: PreloadIpcListener) => {
    assertAllowed(canOn, 'on', channel);
    const wrapped: Wrapped = (_event, ...args) => {
      if (method === 'once') {
        untrack(channel, wrapped);
      }
      listener({}, ...args);
    };
    ipcRenderer.on(channel, wrapped);
    const set = registry.get(channel) ?? new Set();
    set.add(wrapped);
    registry.set(channel, set);
    return () => untrack(channel, wrapped);
  };

  return {
    send: (channel, ...args) => {
      assertAllowed(canSend, 'send', channel);
      ipcRenderer.send(channel, ...args);
    },
    sendSync: (channel, ...args) => {
      assertAllowed(canSend, 'send', channel);
      return ipcRenderer.sendSync(channel, ...args);
    },
    invoke: async (channel, ...args) => {
      assertAllowed(canInvoke, 'invoke', channel);
      return ipcRenderer.invoke(channel, ...args);
    },
    on: (channel, listener) => subscribe('on', channel, listener),
    once: (channel, listener) => subscribe('once', channel, listener),
    removeAllListeners: (channel) => {
      const targets = channel === undefined ? [...registry.keys()] : [channel];
      for (const name of targets) {
        for (const wrapped of registry.get(name) ?? []) {
          untrack(name, wrapped);
        }
      }
    },
  };
}
