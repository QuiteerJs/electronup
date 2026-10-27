import { basename, dirname, extname, join, parse, relative, resolve } from 'node:path';

import type { BrowserWindow } from 'electron';

import { IpcFileOptions, IpcWindowOptions } from './options';

type WindowHandler = (win: BrowserWindow, ...args: any[]) => void;
type FileHandler = (...args: any[]) => unknown;

/**
 * 窗口操作表, 操作对象恒为发起调用的窗口
 *
 * 用 Record 而非 Map, 枚举新增成员时漏写处理会直接类型报错
 */
export const windowHandlers: Record<IpcWindowOptions, WindowHandler> = {
  // 销毁窗口 触发closed事件
  [IpcWindowOptions.DESTROY]: (win) => win.destroy(),
  // 尝试关闭窗口。 该方法与用户手动单击窗口的关闭按钮效果相同。 但网页可能会取消这个关闭操作。
  [IpcWindowOptions.CLOSE]: (win) => win.close(),
  [IpcWindowOptions.SHOW]: (win) => win.show(),
  [IpcWindowOptions.HIDE]: (win) => win.hide(),
  [IpcWindowOptions.FOCUS]: (win) => win.focus(),
  [IpcWindowOptions.BLUR]: (win) => win.blur(),
  [IpcWindowOptions.MAXIMIZE]: (win) => win.maximize(),
  [IpcWindowOptions.UNMAXIMIZE]: (win) => win.unmaximize(),
  [IpcWindowOptions.MINIMIZE]: (win) => win.minimize(),
  [IpcWindowOptions.RESTORE]: (win) => win.restore(),
  [IpcWindowOptions.RELOAD]: (win) => win.reload(),
  [IpcWindowOptions.SET_FULL_SCREEN]: (win, flag: boolean) => win.setFullScreen(flag),
  [IpcWindowOptions.SET_TITLE]: (win, title: string) => win.setTitle(title),
  // 任务栏闪烁
  [IpcWindowOptions.FLASH_FRAME]: (win, flag: boolean) => win.flashFrame(flag),

  // 可以切换的事件
  [IpcWindowOptions.SWITCH_FOCUS]: (win) => {
    if (win.isFocused()) {
      win.blur();
    } else {
      win.focus();
    }
  },
  [IpcWindowOptions.SWITCH_MAX]: (win) => {
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  },
  [IpcWindowOptions.SWITCH_MIN]: (win) => {
    if (win.isMinimized()) {
      win.restore();
    } else {
      win.minimize();
    }
  },
  [IpcWindowOptions.SWITCH_FULL]: (win) => win.setFullScreen(!win.isFullScreen()),
  [IpcWindowOptions.SWITCH_RESIZABLE]: (win) => win.setResizable(!win.isResizable()),
  // 以下三项在 Linux 上不起作用
  [IpcWindowOptions.SWITCH_MOVABLE]: (win) => win.setMovable(!win.isMovable()),
  [IpcWindowOptions.SWITCH_MINIMIZABLE]: (win) => win.setMinimizable(!win.isMinimizable()),
  [IpcWindowOptions.SWITCH_MAXIMIZABLE]: (win) => win.setMaximizable(!win.isMaximizable()),
  [IpcWindowOptions.SWITCH_ALWAYS_ON_TOP]: (win) => win.setAlwaysOnTop(!win.isAlwaysOnTop()),
};

/** 路径操作表, 等价于 node:path 同名方法 */
export const fileHandlers: Record<IpcFileOptions, FileHandler> = {
  [IpcFileOptions.BASENAME]: (path: string, suffix?: string) => basename(path, suffix),
  [IpcFileOptions.DIRNAME]: (path: string) => dirname(path),
  [IpcFileOptions.EXTNAME]: (path: string) => extname(path),
  [IpcFileOptions.JOIN]: (...paths: string[]) => join(...paths),
  [IpcFileOptions.PARSE]: (path: string) => parse(path),
  [IpcFileOptions.RELATIVE]: (from: string, to: string) => relative(from, to),
  [IpcFileOptions.RESOLVE]: (...paths: string[]) => resolve(...paths),
};

/** 只认自有键, 防止渲染层传入 `toString` / `__proto__` 之类命中原型链 */
export function pick<T extends Record<string, unknown>>(
  table: T,
  key: unknown,
): T[keyof T] | undefined {
  return typeof key === 'string' && Object.hasOwn(table, key) ? table[key as keyof T] : undefined;
}
