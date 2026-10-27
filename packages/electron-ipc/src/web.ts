import type { ParsedPath } from 'node:path';

/**
 * 窗口操作
 */
interface ExpandPreloadIpc {
  /**
   * 销毁窗口
   */
  send(channel: '__window_options__', type: 'destroy'): void;
  /**
   * 关闭窗口
   */
  send(channel: '__window_options__', type: 'close'): void;
  /**
   * 窗口显示
   */
  send(channel: '__window_options__', type: 'show'): void;
  /**
   * 窗口隐藏
   */
  send(channel: '__window_options__', type: 'hide'): void;
  /**
   * 窗口获取焦点
   */
  send(channel: '__window_options__', type: 'focus'): void;
  /**
   * 窗口失去焦点
   */
  send(channel: '__window_options__', type: 'blur'): void;
  /**
   * 窗口最大化
   */
  send(channel: '__window_options__', type: 'maximize'): void;
  /**
   * 取消窗口最大化
   */
  send(channel: '__window_options__', type: 'unmaximize'): void;
  /**
   * 窗口最小化
   */
  send(channel: '__window_options__', type: 'minimize'): void;
  /**
   * 还原窗口
   */
  send(channel: '__window_options__', type: 'restore'): void;
  /**
   * 刷新窗口
   */
  send(channel: '__window_options__', type: 'reload'): void;
  /**
   * 窗口全屏
   */
  send(channel: '__window_options__', type: 'setFullScreen', flag: boolean): void;
  /**
   * 设置窗口
   */
  send(channel: '__window_options__', type: 'setTitle', title: string): void;
  /**
   * 任务栏闪烁
   */
  send(channel: '__window_options__', type: 'flashFrame', flag: boolean): void;
  /**
   * 可以切换的事件
   * 聚焦
   * 失去焦点
   */
  send(channel: '__window_options__', type: 'switch-focus'): void;
  /**
   * 可以切换的事件
   * 最大化
   * 取消最大化
   */
  send(channel: '__window_options__', type: 'switch-max'): void;
  /**
   * 可以切换的事件
   * 最小化
   * 取消最小化
   */
  send(channel: '__window_options__', type: 'switch-min'): void;
  /**
   * 可以切换的事件
   * 全屏
   * 取消全屏
   */
  send(channel: '__window_options__', type: 'switch-full'): void;
  /**
   * 可以切换的事件
   * 设置用户是否可以手动调整窗口大小。
   */
  send(channel: '__window_options__', type: 'switch-resizable'): void;
  /**
   * 可以切换的事件
   * 设置用户是否可以移动窗口。 在Linux上不起作用。
   */
  send(channel: '__window_options__', type: 'switch-movable'): void;
  /**
   * 可以切换的事件
   * 设置用户是否可以手动将窗口最小化。 在Linux上不起作用。
   */
  send(channel: '__window_options__', type: 'switch-minimizable'): void;
  /**
   * 可以切换的事件
   * 设置用户是否可以手动最大化窗口。 在Linux上不起作用。
   */
  send(channel: '__window_options__', type: 'switch-maximizable'): void;
  /**
   * 可以切换的事件
   * 设置窗口是否应始终显示在其他窗口的前面。
   */
  send(channel: '__window_options__', type: 'switch-always-on-top'): void;
}

/**
 * 文件操作
 */
interface ExpandPreloadIpc {
  /**
   * path.basename
   */
  invoke(
    channel: '__file_options__',
    type: 'basename',
    path: string,
    suffix?: string,
  ): Promise<string>;
  /**
   * path.dirname
   */
  invoke(channel: '__file_options__', type: 'dirname', path: string): Promise<string>;
  /**
   * path.extname
   */
  invoke(channel: '__file_options__', type: 'extname', path: string): Promise<string>;
  /**
   * path.join
   */
  invoke(channel: '__file_options__', type: 'join', ...paths: string[]): Promise<string>;
  /**
   * path.parse
   */
  invoke(channel: '__file_options__', type: 'parse', path: string): Promise<ParsedPath>;
  /**
   * path.relative
   */
  invoke(channel: '__file_options__', type: 'relative', from: string, to: string): Promise<string>;
  /**
   * path.resolve
   */
  invoke(channel: '__file_options__', type: 'resolve', ...paths: string[]): Promise<string>;
}

/** 本包占用的通道名 */
type IpcReservedChannel = '__window_options__' | '__file_options__';

/** 通道名命中保留通道时收窄为 never, 迫使调用方走 ExpandPreloadIpc 的精确重载 */
type NonReserved<C extends string> = C & (C extends IpcReservedChannel ? never : unknown);

/**
 * 把内置通道的精确签名叠加到预加载暴露的 `$ipc` 类型上
 *
 * 直接写 `PreloadIpc & ExpandPreloadIpc` 时, `PreloadIpc` 的宽松签名 `(channel: string, ...args)`
 * 会兜住所有调用, 写错操作名也不会报错。这里把内置通道从宽松签名里剔除, 其余业务通道不受影响。
 *
 * @example
 * ```ts
 * interface Window {
 *   $ipc: import('@quiteer/electron-ipc/web').WithIpcChannels<import('@quiteer/electron-preload').PreloadIpc>
 * }
 * ```
 */
type WithIpcChannels<Base extends { send: unknown; invoke: unknown }> = Omit<
  Base,
  'send' | 'invoke'
> &
  ExpandPreloadIpc & {
    send<C extends string>(channel: NonReserved<C>, ...args: unknown[]): void;
    invoke<R = any, C extends string = string>(
      channel: NonReserved<C>,
      ...args: unknown[]
    ): Promise<R>;
  };

export type { ExpandPreloadIpc, IpcReservedChannel, WithIpcChannels };
export * from './eventKeys';
export * from './options';
export type {
  ChannelDef,
  ChannelOptions,
  Contract,
  ContractChannels,
  ContractFns,
  ContractSpec,
  StandardSchemaV1,
} from './contract';
export { builtinChannels, channel, channelsOf, defineContract } from './contract';
export type { ContractClient, IpcBridge } from './client';
export { createClient } from './client';
