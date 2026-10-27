import type { Contract, ContractFns } from './contract';
import { findChannel } from './contract';

/**
 * client 依赖的最小桥接接口, 结构上兼容 `@quiteer/electron-preload` 暴露的 `$ipc`
 */
export interface IpcBridge {
  send(channel: string, ...args: any[]): void;
  invoke(channel: string, ...args: any[]): Promise<any>;
  on(channel: string, listener: (event: unknown, ...args: any[]) => void): () => void;
  once(channel: string, listener: (event: unknown, ...args: any[]) => void): () => void;
}

type Fns<C extends Contract, K extends 'invoke' | 'send' | 'on'> = ContractFns<C, K>;

export interface ContractClient<C extends Contract> {
  /** 调用主进程并等待返回 */
  invoke<N extends keyof Fns<C, 'invoke'> & string>(
    channel: N,
    ...args: Parameters<Fns<C, 'invoke'>[N]>
  ): Promise<Awaited<ReturnType<Fns<C, 'invoke'>[N]>>>;
  /** 单向发送给主进程 */
  send<N extends keyof Fns<C, 'send'> & string>(
    channel: N,
    ...args: Parameters<Fns<C, 'send'>[N]>
  ): void;
  /** 监听主进程推送, 回调不再带 event 参数, 返回取消监听的函数 */
  on<N extends keyof Fns<C, 'on'> & string>(
    channel: N,
    listener: (...args: Parameters<Fns<C, 'on'>[N]>) => void,
  ): () => void;
  /** 监听一次, 返回取消监听的函数 */
  once<N extends keyof Fns<C, 'on'> & string>(
    channel: N,
    listener: (...args: Parameters<Fns<C, 'on'>[N]>) => void,
  ): () => void;
}

function resolveBridge(bridge: IpcBridge | undefined): IpcBridge {
  const resolved = bridge ?? (globalThis as { $ipc?: IpcBridge }).$ipc;
  if (!resolved) {
    throw new Error(
      '[electron-ipc] 未找到 $ipc, 请确认已加载 @quiteer/electron-preload, 或显式传入 bridge',
    );
  }
  return resolved;
}

/**
 * 按契约创建渲染层 client, 通道名、参数、返回值全程有类型
 *
 * 契约之外的通道名在运行时同样会被拒绝, 防止 any 绕过类型检查
 *
 * @example
 * ```ts
 * import { createClient } from '@quiteer/electron-ipc/web'
 * import { api } from '../shared/ipc'
 *
 * const client = createClient(api)
 * const user = await client.invoke('user:get', '1')
 * const off = client.on('download:progress', (percent) => {})
 * ```
 */
export function createClient<C extends Contract>(
  contract: C,
  bridge?: IpcBridge,
): ContractClient<C> {
  const ipc = resolveBridge(bridge);
  const assertChannel = (kind: 'invoke' | 'send' | 'on', name: string): void => {
    if (!findChannel(contract, kind, name)) {
      throw new TypeError(`[electron-ipc] 契约中不存在 ${kind} 通道: ${name}`);
    }
  };

  return {
    invoke(name, ...args) {
      try {
        assertChannel('invoke', name);
      } catch (error) {
        return Promise.reject(error);
      }
      return ipc.invoke(name, ...args);
    },
    send(name, ...args) {
      assertChannel('send', name);
      ipc.send(name, ...args);
    },
    on(name, listener) {
      assertChannel('on', name);
      return ipc.on(name, (_event, ...args) => listener(...(args as Parameters<typeof listener>)));
    },
    once(name, listener) {
      assertChannel('on', name);
      return ipc.once(name, (_event, ...args) =>
        listener(...(args as Parameters<typeof listener>)),
      );
    },
  };
}
