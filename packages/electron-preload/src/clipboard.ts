import { ipcRenderer } from 'electron';

import { CLIPBOARD_CHANNEL } from './config';

/** Linux 下可选 `'selection'` 操作选择缓冲区, 其他平台忽略 */
export type PreloadClipboardType = 'clipboard' | 'selection';

/**
 * 可跨进程传递的剪贴板条目: MIME 类型 → 内容
 *
 * 原生 `ClipboardItem` 是类实例, 跨不过 IPC 和 contextBridge, 这里换成普通对象:
 * `text/*` 为字符串, 其他二进制格式为 `Uint8Array`, `electron application/bookmark` 为书签对象
 */
export type PreloadClipboardData = Record<
  string,
  string | Uint8Array | { title: string; url: string }
>;

export interface PreloadClipboard {
  /** 清空剪贴板 */
  clear(type?: PreloadClipboardType): Promise<void>;
  /** 是否存在指定 MIME 类型的内容 */
  has(mimetype: string, type?: PreloadClipboardType): Promise<boolean>;
  read(type?: PreloadClipboardType): Promise<PreloadClipboardData[]>;
  readText(type?: PreloadClipboardType): Promise<string>;
  write(data: PreloadClipboardData[], type?: PreloadClipboardType): Promise<void>;
  writeText(text: string, type?: PreloadClipboardType): Promise<void>;
}

/**
 * sandbox 预加载脚本里拿不到 electron 的 clipboard 模块, 统一转发到主进程执行
 *
 * 主进程侧处理器由 `createPreload({ clipboard: true })` 注册
 */
const call = (method: string, type: PreloadClipboardType | undefined, ...args: unknown[]) =>
  ipcRenderer.invoke(CLIPBOARD_CHANNEL, method, type, ...args);

export const $clipboard: PreloadClipboard = {
  clear: (type) => call('clear', type),
  has: (mimetype, type) => call('has', type, mimetype),
  read: (type) => call('read', type),
  readText: (type) => call('readText', type),
  write: (data, type) => call('write', type, data),
  writeText: (text, type) => call('writeText', type, text),
};
