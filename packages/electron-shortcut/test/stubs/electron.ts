/**
 * 测试替身: 最小可用的 app / BrowserWindow / globalShortcut 实现
 * 仅在 test 打包时通过 alias 替换 electron, 不参与产物构建
 */

class Emitter {
  private _listeners: Record<string, ((...args: any[]) => void)[]> = {};

  on(event: string, listener: (...args: any[]) => void): this {
    (this._listeners[event] ||= []).push(listener);
    return this;
  }

  once(event: string, listener: (...args: any[]) => void): this {
    const wrapper = (...args: any[]): void => {
      this.removeListener(event, wrapper);
      listener(...args);
    };
    (wrapper as any).origin = listener;
    return this.on(event, wrapper);
  }

  removeListener(event: string, listener: (...args: any[]) => void): this {
    this._listeners[event] = (this._listeners[event] ?? []).filter(
      (item) => item !== listener && (item as any).origin !== listener,
    );
    return this;
  }

  listenerCount(event: string): number {
    return (this._listeners[event] ?? []).length;
  }

  emit(event: string, ...args: unknown[]): void {
    for (const listener of (this._listeners[event] ?? []).slice()) {
      listener(...args);
    }
  }
}

class App extends Emitter {
  ready = true;
  private _resolve: (() => void) | undefined;
  private _ready: Promise<void> = Promise.resolve();

  isReady(): boolean {
    return this.ready;
  }

  whenReady(): Promise<void> {
    return this._ready;
  }

  /** 切回未就绪, 调用 markReady 时触发 whenReady */
  setNotReady(): void {
    this.ready = false;
    this._ready = new Promise((resolve) => (this._resolve = resolve));
  }

  async markReady(): Promise<void> {
    this.ready = true;
    this._resolve?.();
    await this._ready;
  }
}

export const app = new App();

export class BrowserWindow extends Emitter {
  static focusedWindow: BrowserWindow | null = null;

  private _destroyed = false;

  static getFocusedWindow(): BrowserWindow | null {
    return BrowserWindow.focusedWindow;
  }

  focus(): void {
    const prev = BrowserWindow.focusedWindow;
    if (prev === this) {
      return;
    }
    if (prev) {
      prev.blur();
    }
    BrowserWindow.focusedWindow = this;
    app.emit('browser-window-focus', {}, this);
  }

  blur(): void {
    if (BrowserWindow.focusedWindow !== this) {
      return;
    }
    BrowserWindow.focusedWindow = null;
    app.emit('browser-window-blur', {}, this);
  }

  isDestroyed(): boolean {
    return this._destroyed;
  }

  close(): void {
    this.blur();
    this._destroyed = true;
    this.emit('closed');
  }
}

/** 其他应用占用的按键组合, 注册会返回 false */
const occupied = new Set<string>();
const registered = new Map<string, () => void>();

export const globalShortcut = {
  register(accelerator: string, callback: () => void): boolean {
    if (accelerator.includes('Invalid')) {
      throw new TypeError(`conversion failure from ${accelerator}`);
    }
    if (occupied.has(accelerator) || registered.has(accelerator)) {
      return false;
    }
    registered.set(accelerator, callback);
    return true;
  },
  unregister(accelerator: string): void {
    registered.delete(accelerator);
  },
  unregisterAll(): void {
    registered.clear();
  },
  isRegistered(accelerator: string): boolean {
    return registered.has(accelerator);
  },

  // 以下为测试辅助
  press(accelerator: string): boolean {
    const callback = registered.get(accelerator);
    callback?.();
    return callback !== undefined;
  },
  keys(): string[] {
    return [...registered.keys()];
  },
  occupy(accelerator: string): void {
    occupied.add(accelerator);
  },
  reset(): void {
    occupied.clear();
    registered.clear();
    BrowserWindow.focusedWindow = null;
    app.ready = true;
  },
};
