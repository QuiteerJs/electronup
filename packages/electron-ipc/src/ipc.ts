import type { IpcMainEvent, IpcMainInvokeEvent } from 'electron';
import { BrowserWindow, ipcMain } from 'electron';

import { EventKeys } from './eventKeys';
import { fileHandlers, pick, windowHandlers } from './handlers';

export interface IpcModule {
  /** 是否已注册通道 */
  readonly initialized: boolean;
  /** 注册内置通道, 重复调用无副作用 */
  init: () => void;
  /** 注销内置通道, 之后可再次 init */
  destroy: () => void;
}

const onWindow = (event: IpcMainEvent, type: unknown, ...args: unknown[]): void => {
  const handler = pick(windowHandlers, type);
  const win = BrowserWindow.fromWebContents(event.sender);
  if (handler && win && !win.isDestroyed()) {
    handler(win, ...args);
  }
};

const onFile = (_event: IpcMainInvokeEvent, type: unknown, ...args: unknown[]): unknown => {
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
 * ```
 */
export const Ipc: IpcModule = {
  get initialized() {
    return initialized;
  },

  init() {
    // ipcMain.handle 重复注册会直接抛错, 这里保证幂等
    if (initialized) {
      return;
    }
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
