import { BrowserWindow, app, globalShortcut } from 'electron';

import { ShortcutError } from './error';
import type {
  ShortcutController,
  ShortcutHandler,
  ShortcutOptions,
  ShortcutScope,
  ShortcutWindow,
} from './types';

export interface ShortcutManager<N extends string = string> {
  /** 已注册快捷键数量 */
  readonly size: number;
  /** 是否处于暂停状态 */
  readonly suspended: boolean;
  /** 注册快捷键, 应用未 ready 时会在 ready 后自动生效 */
  register: (options: ShortcutOptions<N>) => ShortcutController<N>;
  /** 按名取控制句柄 */
  get: (name: N) => ShortcutController<N> | undefined;
  /** 按名取控制句柄, 不存在时抛错 */
  getOrThrow: (name: N) => ShortcutController<N>;
  has: (name: N) => boolean;
  /** 启用快捷键, 不存在返回 false */
  enable: (name: N) => boolean;
  /** 停用快捷键 (保留注册), 不存在返回 false */
  disable: (name: N) => boolean;
  /** 换绑按键组合, 不存在返回 false */
  setAccelerator: (name: N, accelerator: string | string[]) => boolean;
  /** 注销并摘除快捷键, 不存在返回 false */
  unregister: (name: N) => boolean;
  /** 注销全部快捷键 */
  unregisterAll: () => void;
  /** 暂停全部快捷键 (如录制新快捷键期间), 保留注册 */
  suspend: () => void;
  /** 恢复暂停的快捷键 */
  resume: () => void;
  /** 当前占用该按键组合的快捷键名称 */
  ownerOf: (accelerator: string) => N | undefined;
  /** 该按键组合是否已被本应用注册 (含管理器之外直接调用 globalShortcut 的注册) */
  isRegistered: (accelerator: string) => boolean;
  /** 所有快捷键句柄 */
  list: () => ShortcutController<N>[];
  /** 所有快捷键名称 */
  names: () => N[];
}

interface Entry<N extends string> {
  name: N;
  scope: ShortcutScope;
  accelerators: string[];
  enabled: boolean;
  handler: ShortcutHandler<N>;
  window: ShortcutWindow | undefined;
  onError: ShortcutOptions<N>['onError'];
  /** 当前已注册到系统的按键组合 */
  bound: string[];
  disposed: boolean;
  controller: ShortcutController<N>;
  cleanup: (() => void) | undefined;
}

/** 按键组合比较用: 忽略大小写与空白 */
function normalize(accelerator: string): string {
  return accelerator.replace(/\s+/g, '').toLowerCase();
}

function toList(accelerator: string | string[]): string[] {
  const list = [...new Set(Array.isArray(accelerator) ? accelerator : [accelerator])];
  if (list.length === 0 || list.some((item) => item.trim() === '')) {
    throw new TypeError('[electron-shortcut] accelerator 不能为空');
  }
  return list;
}

function resolveWindow(window: ShortcutWindow): BrowserWindow | null | undefined {
  return typeof window === 'function' ? window() : window;
}

/**
 * 上报注册失败
 * @param sync 由用户同步调用触发时, 无 onError 则直接抛出
 */
function report<N extends string>(entry: Entry<N>, error: ShortcutError, sync: boolean): void {
  if (entry.onError) {
    entry.onError(error);
    return;
  }
  if (sync) {
    throw error;
  }
  console.error(error);
}

/**
 * 创建快捷键管理器
 *
 * @example
 * ```ts
 * export const shortcuts = createShortcutManager<'toggle' | 'save'>()
 *
 * shortcuts.register({
 *   name: 'toggle',
 *   accelerator: 'CmdOrCtrl+Shift+K',
 *   handler: () => windows.focus('main'),
 * })
 *
 * // 只在主窗口聚焦时生效, 不影响其他应用
 * shortcuts.register({
 *   name: 'save',
 *   accelerator: 'CmdOrCtrl+S',
 *   window: () => windows.get('main'),
 *   handler: () => save(),
 * })
 * ```
 */
export function createShortcutManager<N extends string = string>(): ShortcutManager<N> {
  const entries = new Map<N, Entry<N>>();
  let focused: BrowserWindow | null = null;
  let suspended = false;
  let quitting = false;
  let attached = false;

  const shouldBind = (entry: Entry<N>): boolean => {
    if (entry.disposed || !entry.enabled || suspended || quitting || !app.isReady()) {
      return false;
    }
    if (entry.scope === 'global') {
      return true;
    }
    if (!focused || focused.isDestroyed()) {
      return false;
    }
    return entry.window === undefined || resolveWindow(entry.window) === focused;
  };

  const ownerOf = (accelerator: string): N | undefined => {
    const key = normalize(accelerator);
    for (const entry of entries.values()) {
      if (entry.bound.some((item) => normalize(item) === key)) {
        return entry.name;
      }
    }
    return undefined;
  };

  const unbind = (entry: Entry<N>): void => {
    for (const accelerator of entry.bound) {
      globalShortcut.unregister(accelerator);
    }
    entry.bound = [];
  };

  /** 注册全部按键组合, 任一失败则回滚本次已注册的部分 */
  const bind = (entry: Entry<N>): ShortcutError | undefined => {
    const done: string[] = [];
    const fail = (error: ShortcutError): ShortcutError => {
      for (const accelerator of done) {
        globalShortcut.unregister(accelerator);
      }
      return error;
    };

    for (const accelerator of entry.accelerators) {
      const owner = ownerOf(accelerator);
      if (owner !== undefined) {
        return fail(new ShortcutError(entry.name, accelerator, 'duplicate', owner));
      }

      let ok: boolean;
      try {
        ok = globalShortcut.register(accelerator, () =>
          entry.handler({ name: entry.name, accelerator, shortcut: entry.controller }),
        );
      } catch (error) {
        return fail(new ShortcutError(entry.name, accelerator, 'invalid', undefined, error));
      }
      if (!ok) {
        return fail(new ShortcutError(entry.name, accelerator, 'occupied'));
      }
      done.push(accelerator);
    }

    entry.bound = done;
    return undefined;
  };

  const sync = (entry: Entry<N>): void => {
    const want = shouldBind(entry);
    if (!want && entry.bound.length > 0) {
      unbind(entry);
    } else if (want && entry.bound.length === 0) {
      const error = bind(entry);
      if (error) {
        report(entry, error, true);
      }
    }
  };

  /** 先统一注销再注册, 保证不同窗口间共用同一组合时能顺利交接 */
  const syncAll = (): void => {
    const list = [...entries.values()];
    for (const entry of list) {
      if (entry.bound.length > 0 && !shouldBind(entry)) {
        unbind(entry);
      }
    }
    for (const entry of list) {
      if (entry.bound.length === 0 && shouldBind(entry)) {
        const error = bind(entry);
        if (error) {
          report(entry, error, false);
        }
      }
    }
  };

  const onFocus = (_event: unknown, win: BrowserWindow): void => {
    focused = win;
    syncAll();
  };

  const onBlur = (_event: unknown, win: BrowserWindow): void => {
    if (focused === win) {
      focused = null;
    }
    syncAll();
  };

  /** 退出前主动注销, 避免进程结束前快捷键仍被占用 */
  const onWillQuit = (): void => {
    quitting = true;
    for (const entry of entries.values()) {
      unbind(entry);
    }
  };

  const attach = (): void => {
    if (attached) {
      return;
    }
    attached = true;
    quitting = false;
    focused = BrowserWindow.getFocusedWindow();
    app.on('browser-window-focus', onFocus);
    app.on('browser-window-blur', onBlur);
    app.on('will-quit', onWillQuit);
    if (!app.isReady()) {
      void app.whenReady().then(syncAll);
    }
  };

  const detach = (): void => {
    if (!attached) {
      return;
    }
    attached = false;
    focused = null;
    app.removeListener('browser-window-focus', onFocus);
    app.removeListener('browser-window-blur', onBlur);
    app.removeListener('will-quit', onWillQuit);
  };

  const dispose = (entry: Entry<N>): void => {
    if (entry.disposed) {
      return;
    }
    entry.disposed = true;
    unbind(entry);
    entry.cleanup?.();
    entry.cleanup = undefined;
    if (entries.get(entry.name) === entry) {
      entries.delete(entry.name);
    }
    if (entries.size === 0) {
      detach();
    }
  };

  const setAccelerator = (entry: Entry<N>, accelerator: string | string[]): void => {
    const next = toList(accelerator);
    const prev = entry.accelerators;
    const wasBound = entry.bound.length > 0;

    unbind(entry);
    entry.accelerators = next;
    if (!shouldBind(entry)) {
      return;
    }

    const error = bind(entry);
    if (error) {
      entry.accelerators = prev;
      if (wasBound) {
        bind(entry);
      }
      report(entry, error, true);
    }
  };

  const createController = (entry: Entry<N>): ShortcutController<N> => ({
    get name() {
      return entry.name;
    },
    get scope() {
      return entry.scope;
    },
    get accelerator() {
      return [...entry.accelerators];
    },
    set accelerator(value) {
      setAccelerator(entry, value);
    },
    get enabled() {
      return entry.enabled;
    },
    set enabled(value) {
      entry.enabled = value;
      sync(entry);
    },
    get handler() {
      return entry.handler;
    },
    set handler(value) {
      entry.handler = value;
    },
    get registered() {
      return entry.bound.length > 0;
    },
    get disposed() {
      return entry.disposed;
    },
    enable: () => {
      entry.enabled = true;
      sync(entry);
    },
    disable: () => {
      entry.enabled = false;
      sync(entry);
    },
    unregister: () => dispose(entry),
  });

  const register = (options: ShortcutOptions<N>): ShortcutController<N> => {
    const { name, window } = options;
    const existing = entries.get(name);

    if (existing) {
      const strategy = options.conflict ?? 'recreate';
      if (strategy === 'error') {
        throw new Error(`[electron-shortcut] 快捷键 "${name}" 已存在`);
      }
      if (strategy === 'reuse') {
        return existing.controller;
      }
      dispose(existing);
    }

    const entry = {
      name,
      scope: options.scope ?? (window === undefined ? 'global' : 'focused'),
      accelerators: toList(options.accelerator),
      enabled: options.enabled ?? true,
      handler: options.handler,
      window,
      onError: options.onError,
      bound: [],
      disposed: false,
      cleanup: undefined,
    } as Omit<Entry<N>, 'controller'> as Entry<N>;
    entry.controller = createController(entry);

    entries.set(name, entry);
    attach();

    // 绑定具体窗口实例时, 窗口关闭即注销, 避免引用已销毁的窗口
    if (window !== undefined && typeof window !== 'function') {
      const onClosed = (): void => dispose(entry);
      window.once('closed', onClosed);
      entry.cleanup = () => window.removeListener('closed', onClosed);
    }

    try {
      sync(entry);
    } catch (error) {
      dispose(entry);
      throw error;
    }

    return entry.controller;
  };

  const withEntry = (name: N, fn: (entry: Entry<N>) => void): boolean => {
    const entry = entries.get(name);
    if (!entry) {
      return false;
    }
    fn(entry);
    return true;
  };

  return {
    get size() {
      return entries.size;
    },
    get suspended() {
      return suspended;
    },
    register,
    get: (name) => entries.get(name)?.controller,
    getOrThrow: (name) => {
      const entry = entries.get(name);
      if (!entry) {
        throw new Error(`[electron-shortcut] 快捷键 "${name}" 不存在`);
      }
      return entry.controller;
    },
    has: (name) => entries.has(name),
    enable: (name) => withEntry(name, (entry) => entry.controller.enable()),
    disable: (name) => withEntry(name, (entry) => entry.controller.disable()),
    setAccelerator: (name, accelerator) =>
      withEntry(name, (entry) => setAccelerator(entry, accelerator)),
    unregister: (name) => withEntry(name, dispose),
    unregisterAll: () => {
      for (const entry of entries.values()) {
        dispose(entry);
      }
    },
    suspend: () => {
      suspended = true;
      syncAll();
    },
    resume: () => {
      suspended = false;
      syncAll();
    },
    ownerOf,
    isRegistered: (accelerator) => globalShortcut.isRegistered(accelerator),
    list: () => [...entries.values()].map((entry) => entry.controller),
    names: () => [...entries.keys()],
  };
}
