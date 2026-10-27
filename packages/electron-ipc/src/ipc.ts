import type { IpcMainEvent, IpcMainInvokeEvent } from 'electron';
import { BrowserWindow, ipcMain } from 'electron';

import { EventKeys } from './eventKeys';
import { fileHandlers, pick, windowHandlers } from './handlers';

export interface IpcInitOptions {
  /**
   * 允许调用内置通道的页面来源, 如 `['https://app.example.com', 'file://']`
   *
   * `file://` 按协议匹配, 其余按 `URL.origin` 精确匹配; 不传则不限制来源
   */
  allowedOrigins?: readonly string[];
  /**
   * 自定义来源校验, 返回 false 时忽略这次调用; 传入后替代默认校验
   *
   * 默认只接受主 frame 发起的调用, 子 frame (含第三方 iframe) 一律拒绝
   */
  validateSender?: (event: IpcMainEvent | IpcMainInvokeEvent) => boolean;
}

export interface IpcModule {
  /** 是否已注册通道 */
  readonly initialized: boolean;
  /** 注册内置通道, 重复调用无副作用(以首次传入的选项为准) */
  init: (options?: IpcInitOptions) => void;
  /** 注销内置通道, 之后可再次 init */
  destroy: () => void;
}

function matchOrigin(url: string, allowed: readonly string[]): boolean {
  if (url.startsWith('file://')) {
    return allowed.includes('file://');
  }
  try {
    return allowed.includes(new URL(url).origin);
  } catch {
    return false;
  }
}

function createValidator(
  options: IpcInitOptions,
): (event: IpcMainEvent | IpcMainInvokeEvent) => boolean {
  if (options.validateSender) {
    return options.validateSender;
  }
  const { allowedOrigins } = options;
  return (event) => {
    const frame = event.senderFrame;
    // senderFrame 在 frame 已导航或销毁时为 null, 同样拒绝
    if (!frame || frame.parent !== null) {
      return false;
    }
    return !allowedOrigins || matchOrigin(frame.url, allowedOrigins);
  };
}

let validate: (event: IpcMainEvent | IpcMainInvokeEvent) => boolean = () => false;

const onWindow = (event: IpcMainEvent, type: unknown, ...args: unknown[]): void => {
  if (!validate(event)) {
    return;
  }
  const handler = pick(windowHandlers, type);
  const win = BrowserWindow.fromWebContents(event.sender);
  if (handler && win && !win.isDestroyed()) {
    handler(win, ...args);
  }
};

const onFile = (event: IpcMainInvokeEvent, type: unknown, ...args: unknown[]): unknown => {
  if (!validate(event)) {
    throw new Error('[electron-ipc] 调用来源未通过校验');
  }
  const handler = pick(fileHandlers, type);
  if (!handler) {
    throw new Error(`[electron-ipc] 未知的路径操作: ${String(type)}`);
  }
  return handler(...args);
};

let initialized = false;

/**
 * 内置 IPC 通道
 *
 * @example
 * ```ts
 * import { Ipc } from '@quiteer/electron-ipc'
 *
 * app.whenReady().then(() => Ipc.init())
 * // 限定来源
 * Ipc.init({ allowedOrigins: ['file://', 'http://localhost:5173'] })
 * ```
 */
export const Ipc: IpcModule = {
  get initialized() {
    return initialized;
  },

  init(options = {}) {
    // ipcMain.handle 重复注册会直接抛错, 这里保证幂等
    if (initialized) {
      return;
    }
    validate = createValidator(options);
    ipcMain.on(EventKeys.WindowOptionsKey, onWindow);
    ipcMain.handle(EventKeys.FileOptionsKey, onFile);
    initialized = true;
  },

  destroy() {
    // 只摘自己的监听, 不误伤业务方挂在同名通道上的回调
    ipcMain.removeListener(EventKeys.WindowOptionsKey, onWindow);
    ipcMain.removeHandler(EventKeys.FileOptionsKey);
    initialized = false;
  },
};
