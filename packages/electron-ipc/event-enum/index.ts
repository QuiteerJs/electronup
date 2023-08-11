import type { ParsedPath } from 'node:path'

/**
   * 窗口操作
   */
interface ExpandPreloadIpc {
  /**
   * 销毁窗口
   */
  send(channel: '__window_options__', type: 'destroy'): void
  /**
   * 关闭窗口
   */
  send(channel: '__window_options__', type: 'close'): void
  /**
   * 窗口显示
   */
  send(channel: '__window_options__', type: 'show'): void
  /**
   * 窗口隐藏
   */
  send(channel: '__window_options__', type: 'hide'): void
  /**
   * 窗口获取焦点
   */
  send(channel: '__window_options__', type: 'focus'): void
  /**
   * 窗口失去焦点
   */
  send(channel: '__window_options__', type: 'blur'): void
  /**
   * 窗口最大化
   */
  send(channel: '__window_options__', type: 'maximize'): void
  /**
   * 取消窗口最大化
   */
  send(channel: '__window_options__', type: 'unmaximize'): void
  /**
   * 窗口最小化
   */
  send(channel: '__window_options__', type: 'minimize'): void
  /**
   * 还原窗口
   */
  send(channel: '__window_options__', type: 'restore'): void
  /**
   * 刷新窗口
   */
  send(channel: '__window_options__', type: 'reload'): void
  /**
   * 窗口全屏
   */
  send(channel: '__window_options__', type: 'setFullScreen'): void
  /**
   * 设置窗口
   */
  send(channel: '__window_options__', type: 'setTitle', title: string): void
  /**
   * 任务栏闪烁
   */
  send(channel: '__window_options__', type: 'flashFrame', flag: boolean): void
  /**
   * 可以切换的事件
   * 聚焦
   * 失去焦点
   */
  send(channel: '__window_options__', type: 'switch-focus'): void
  /**
   * 可以切换的事件
   * 最大化
   * 取消最大化
   */
  send(channel: '__window_options__', type: 'switch-max'): void
  /**
   * 可以切换的事件
   * 最小化
   * 取消最小化
   */
  send(channel: '__window_options__', type: 'switch-min'): void
  /**
   * 可以切换的事件
   * 全屏
   * 取消全屏
   */
  send(channel: '__window_options__', type: 'switch-full'): void
  /**
   * 可以切换的事件
   * 设置用户是否可以手动调整窗口大小。
   */
  send(channel: '__window_options__', type: 'switch-resizable'): void
  /**
   * 可以切换的事件
   * 设置用户是否可以移动窗口。 在Linux上不起作用。
   */
  send(channel: '__window_options__', type: 'switch-movable'): void
  /**
   * 可以切换的事件
   * 设置用户是否可以手动将窗口最小化。 在Linux上不起作用。
   */
  send(channel: '__window_options__', type: 'switch-minimizable'): void
  /**
   * 可以切换的事件
   * 设置用户是否可以手动最大化窗口。 在Linux上不起作用。
   */
  send(channel: '__window_options__', type: 'switch-maximizable'): void
  /**
   * 可以切换的事件
   * 设置窗口是否应始终显示在其他窗口的前面。
   */
  send(channel: '__window_options__', type: 'switch-always-on-top'): void
}

/**
   * 文件操作
   */
interface ExpandPreloadIpc {
  /**
   * path.basename
   */
  invoke(channel: '__file_options__', type: 'basename', path: string, suffix?: string): Promise<string>
  /**
  * path.dirname
  */
  invoke(channel: '__file_options__', type: 'dirname', path: string): Promise<string>
  /**
   * path.extname
   */
  invoke(channel: '__file_options__', type: 'extname', path: string): Promise<string>
  /**
   * path.join
   */
  invoke(channel: '__file_options__', type: 'join', ...paths: string[]): Promise<string>
  /**
   * path.parse
   */
  invoke(channel: '__file_options__', type: 'parse', path: string): Promise<ParsedPath>
  /**
   * path.relative
   */
  invoke(channel: '__file_options__', type: 'relative', from: string, to: string): Promise<string>
  /**
   * path.resolve
   */
  invoke(channel: '__file_options__', type: 'resolve', ...paths: string[]): Promise<string>
}

export type { ExpandPreloadIpc }
export * from './eventKays'
export * from './options'
