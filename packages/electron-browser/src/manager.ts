import type { BrowserWindow } from 'electron';

import { WinStore } from './store';
import type { WindowController, WindowOptions } from './types';
import { createWindow, toController } from './window';

export interface WindowManager<N extends string = string> {
  /** 窗口仓库 */
  store: WinStore<N>;
  /** 已注册窗口数量 */
  readonly size: number;
  /** 创建窗口并注册 */
  create: (options: WindowOptions<N>) => WindowController<N>;
  /** 把外部创建的窗口纳入管理 */
  register: (name: N, win: BrowserWindow) => WindowController<N>;
  /** 按名取窗口实例 */
  get: (name: N) => BrowserWindow | undefined;
  /** 按名取控制句柄 */
  getController: (name: N) => WindowController<N> | undefined;
  /** 按名取窗口实例, 不存在时抛错 */
  getOrThrow: (name: N) => BrowserWindow;
  has: (name: N) => boolean;
  /** 还原并聚焦窗口, 不存在返回 false */
  focus: (name: N) => boolean;
  /** 关闭窗口, 不存在返回 false */
  close: (name: N) => boolean;
  /** 关闭所有窗口 */
  closeAll: () => Promise<void>;
  /** 向所有窗口广播消息 */
  broadcast: (channel: string, ...args: unknown[]) => void;
  /** 所有存活窗口实例 */
  list: () => BrowserWindow[];
  /** 所有窗口名称 */
  names: () => N[];
}

/**
 * 创建窗口管理器
 *
 * @example
 * ```ts
 * export const windows = createWindowManager<'main' | 'settings'>()
 *
 * windows.create({ name: 'main', width: 1200, height: 800 })
 * windows.get('main')?.webContents.send('ping')
 * ```
 */
export function createWindowManager<N extends string = string>(): WindowManager<N> {
  const store = new WinStore<N>();

  const focus = (name: N): boolean => {
    const win = store.get(name);
    if (!win) {
      return false;
    }
    if (win.isMinimized()) {
      win.restore();
    }
    if (!win.isVisible()) {
      win.show();
    }
    win.focus();
    return true;
  };

  const getOrThrow = (name: N): BrowserWindow => {
    const win = store.get(name);
    if (!win) {
      throw new Error(`[electron-browser] 窗口 "${name}" 不存在或已销毁`);
    }
    return win;
  };

  const create = (options: WindowOptions<N>): WindowController<N> => {
    // 先解析父窗口, 找不到时直接抛错, 不影响已有窗口
    const parent = typeof options.parent === 'string' ? getOrThrow(options.parent) : options.parent;
    const strategy = options.conflict ?? 'focus';
    const existing = store.getController(options.name);

    if (existing) {
      if (strategy === 'error') {
        throw new Error(`[electron-browser] 窗口 "${options.name}" 已存在`);
      }
      if (strategy === 'focus') {
        focus(options.name);
        return existing;
      }
      store.remove(options.name);
      if (!existing.target.isDestroyed()) {
        existing.target.close();
      }
    }

    return store.register(options.name, createWindow({ ...options, parent }));
  };

  const close = (name: N): boolean => {
    const win = store.get(name);
    if (!win) {
      return false;
    }
    win.close();
    return true;
  };

  const broadcast = (channel: string, ...args: unknown[]): void => {
    for (const [, controller] of store.entries()) {
      controller.target.webContents.send(channel, ...args);
    }
  };

  return {
    store,
    get size() {
      return store.size;
    },
    create,
    register: (name, win) => store.register(name, toController(win, name)),
    get: (name) => store.get(name),
    getController: (name) => store.getController(name),
    getOrThrow,
    has: (name) => store.has(name),
    focus,
    close,
    closeAll: () => store.closeAll(),
    broadcast,
    list: () => store.list(),
    names: () => store.names(),
  };
}
