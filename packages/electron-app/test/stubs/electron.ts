/**
 * 测试替身: 最小可用的 app / BrowserWindow 实现
 * 仅在 test 打包时通过 alias 替换 electron, 不参与产物构建
 */

class Emitter {
  private _listeners: Record<string, ((...args: any[]) => void)[]> = {};

  on(event: string, listener: (...args: any[]) => void): this {
    (this._listeners[event] ||= []).push(listener);
    return this;
  }

  removeListener(event: string, listener: (...args: any[]) => void): this {
    this._listeners[event] = (this._listeners[event] ?? []).filter((item) => item !== listener);
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

/** 可被 preventDefault 的事件对象 */
export function createEvent(): { defaultPrevented: boolean; preventDefault: () => void } {
  const event = {
    defaultPrevented: false,
    preventDefault: () => {
      event.defaultPrevented = true;
    },
  };
  return event;
}

class App extends Emitter {
  lock = true;
  lockData: unknown[] = [];
  protocols: unknown[][] = [];
  quitCalls = 0;
  quitted = false;

  private _resolve: (() => void) | undefined;
  private _ready: Promise<void> = Promise.resolve();

  requestSingleInstanceLock(...args: unknown[]): boolean {
    this.lockData.push(...args);
    return this.lock;
  }

  setAsDefaultProtocolClient(...args: unknown[]): boolean {
    this.protocols.push(args);
    return true;
  }

  whenReady(): Promise<void> {
    return this._ready;
  }

  /** 模拟 Electron: before-quit 未被阻止时进入 will-quit 并退出 */
  quit(): void {
    this.quitCalls++;
    const event = createEvent();
    this.emit('before-quit', event);
    if (!event.defaultPrevented) {
      this.emit('will-quit', createEvent());
      this.quitted = true;
    }
  }

  // 以下为测试辅助
  setNotReady(): void {
    this._ready = new Promise((resolve) => (this._resolve = resolve));
  }

  markReady(): void {
    this._resolve?.();
  }

  reset(): void {
    this.lock = true;
    this.lockData = [];
    this.protocols = [];
    this.quitCalls = 0;
    this.quitted = false;
    this._ready = Promise.resolve();
    BrowserWindow.all = [];
  }
}

export const app = new App();

export class BrowserWindow extends Emitter {
  static all: BrowserWindow[] = [];

  minimized = false;
  visible = true;
  focused = 0;
  private _destroyed = false;

  constructor() {
    super();
    BrowserWindow.all.push(this);
  }

  static getAllWindows(): BrowserWindow[] {
    return BrowserWindow.all.filter((win) => !win.isDestroyed());
  }

  isMinimized(): boolean {
    return this.minimized;
  }

  restore(): void {
    this.minimized = false;
  }

  isVisible(): boolean {
    return this.visible;
  }

  show(): void {
    this.visible = true;
  }

  focus(): void {
    this.focused++;
  }

  isDestroyed(): boolean {
    return this._destroyed;
  }

  destroy(): void {
    this._destroyed = true;
  }
}
