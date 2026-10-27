/**
 * 主进程入口: `@quiteer/electron-preload/main`
 *
 * 负责生成预加载配置(通道白名单 / 是否暴露剪贴板), 并在需要时注册剪贴板处理器
 */
import { fileURLToPath } from 'node:url';

import type { IpcMainInvokeEvent } from 'electron';
import { clipboard, ClipboardItem, ipcMain } from 'electron';

import type { PreloadClipboardData, PreloadClipboardType } from './clipboard';
import type { PreloadChannels } from './config';
import { BUILTIN_CHANNELS, CLIPBOARD_CHANNEL, encodeConfig } from './config';

export type { PreloadChannels, PreloadClipboardData, PreloadClipboardType };

/** 预加载脚本的绝对路径, 与包默认导出相同 */
export const preloadPath: string = fileURLToPath(new URL('./preload.cjs', import.meta.url));

export interface CreatePreloadOptions {
  /** 业务通道白名单, 条目以 `*` 结尾时按前缀匹配 */
  channels?: PreloadChannels;
  /** 是否放行 `@quiteer/electron-ipc` 的内置通道, 默认 `true` */
  builtinChannels?: boolean;
  /** 是否暴露 `$clipboard`, 默认 `false`; 开启时会在主进程注册剪贴板处理器 */
  clipboard?: boolean;
}

/** 可直接展开进 `webPreferences` 的字段 */
export interface PreloadWebPreferences {
  preload: string;
  additionalArguments: string[];
}

/**
 * 生成预加载配置
 *
 * @example
 * ```ts
 * new BrowserWindow({
 *   webPreferences: {
 *     sandbox: true,
 *     ...createPreload({ channels: { invoke: ['user:*'], on: ['download:progress'] } }),
 *   },
 * })
 * ```
 */
export function createPreload(options: CreatePreloadOptions = {}): PreloadWebPreferences {
  const { channels = {}, builtinChannels = true, clipboard = false } = options;
  const merge = (key: keyof PreloadChannels) => [
    ...new Set([...(builtinChannels ? BUILTIN_CHANNELS[key] : []), ...(channels[key] ?? [])]),
  ];
  if (clipboard) {
    registerClipboardHandler();
  }
  return {
    preload: preloadPath,
    additionalArguments: [
      encodeConfig({
        channels: { send: merge('send'), invoke: merge('invoke'), on: merge('on') },
        clipboard,
      }),
    ],
  };
}

/** selection 仅 Linux 存在, 其他平台回落到系统剪贴板 */
const target = (type: unknown) => (type === 'selection' && clipboard.selection) || clipboard;

/** 渲染层传来的普通对象 → 原生 ClipboardItem */
function toItem(data: PreloadClipboardData): ClipboardItem {
  const entries = Object.entries(data).map(([mime, value]) => [
    mime,
    value instanceof Uint8Array ? new Blob([value], { type: mime }) : value,
  ]);
  return new ClipboardItem(Object.fromEntries(entries));
}

/** 原生 ClipboardItem → 可跨进程传递的普通对象 */
async function fromItem(item: ClipboardItem): Promise<PreloadClipboardData> {
  const data: PreloadClipboardData = {};
  for (const mime of item.types) {
    const value = await item.getType(mime);
    if (value instanceof Blob) {
      data[mime] = mime.startsWith('text/')
        ? await value.text()
        : new Uint8Array(await value.arrayBuffer());
    } else {
      data[mime] = value;
    }
  }
  return data;
}

const clipboardHandlers: Record<string, (type: unknown, ...args: any[]) => unknown> = {
  clear: (type) => target(type).clear(),
  has: (type, mimetype: string) => target(type).has(String(mimetype)),
  read: async (type) => Promise.all((await target(type).read()).map(fromItem)),
  readText: (type) => target(type).readText(),
  write: (type, data: unknown) => {
    if (!Array.isArray(data)) {
      throw new TypeError('[electron-preload] clipboard.write 需要传入数组');
    }
    return target(type).write(data.map(toItem));
  },
  writeText: (type, text: unknown) => target(type).writeText(String(text)),
};

function onClipboard(
  event: IpcMainInvokeEvent,
  method: unknown,
  type: unknown,
  ...args: unknown[]
): unknown {
  // 子 frame (含第三方 iframe) 不得读写剪贴板
  if (event.senderFrame?.parent !== null) {
    throw new Error('[electron-preload] 只允许主 frame 访问剪贴板');
  }
  if (typeof method !== 'string' || !Object.hasOwn(clipboardHandlers, method)) {
    throw new Error(`[electron-preload] 未知的剪贴板操作: ${String(method)}`);
  }
  return clipboardHandlers[method](type, ...args);
}

let registered = false;

/** 注册剪贴板处理器, 重复调用无副作用; `createPreload({ clipboard: true })` 会自动调用 */
export function registerClipboardHandler(): void {
  if (registered) {
    return;
  }
  ipcMain.handle(CLIPBOARD_CHANNEL, onClipboard);
  registered = true;
}

/** 注销剪贴板处理器, 之后可再次注册 */
export function removeClipboardHandler(): void {
  ipcMain.removeHandler(CLIPBOARD_CHANNEL);
  registered = false;
}
