/**
 * 测试替身: 最小可用的 BrowserWindow / WebContents 实现
 * 仅在 test 打包时通过 alias 替换 electron, 不参与产物构建
 */

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WebPreferences {
  contextIsolation?: boolean;
  sandbox?: boolean;
  nodeIntegration?: boolean;
  webSecurity?: boolean;
  preload?: string;
}

export interface BrowserWindowConstructorOptions {
  width?: number;
  height?: number;
  x?: number;
  y?: number;
  show?: boolean;
  title?: string;
  parent?: BrowserWindow;
  modal?: boolean;
  webPreferences?: WebPreferences;
}

export interface HandlerDetails {
  url: string;
}

export type WindowOpenHandlerResponse = { action: 'deny' } | { action: 'allow' };

export interface NavigateEvent {
  url: string;
  defaultPrevented: boolean;
  preventDefault: () => void;
}

export const app = {
  userData: '',
  getPath(_name: 'userData'): string {
    return app.userData;
  },
};

export const shell = {
  opened: [] as string[],
  async openExternal(url: string): Promise<void> {
    shell.opened.push(url);
  },
};

interface Display {
  workArea: Rectangle;
}

export const screen = {
  displays: [{ workArea: { x: 0, y: 0, width: 1920, height: 1080 } }] as Display[],
  getAllDisplays(): Display[] {
    return screen.displays;
  },
  getPrimaryDisplay(): Display {
    return screen.displays[0];
  },
};

export class WebContents {
  id: number;
  private _winId: number;

  constructor(id: number, winId: number) {
    this.id = id;
    this._winId = winId;
  }

  url = '';
  windowOpenHandler: ((details: HandlerDetails) => WindowOpenHandlerResponse) | undefined;
  private _listeners: Record<string, ((event: NavigateEvent) => void)[]> = {};

  getURL(): string {
    return this.url;
  }

  on(event: string, listener: (event: NavigateEvent) => void): this {
    (this._listeners[event] ||= []).push(listener);
    return this;
  }

  setWindowOpenHandler(handler: (details: HandlerDetails) => WindowOpenHandlerResponse): void {
    this.windowOpenHandler = handler;
  }

  /** 模拟页面发起导航, 返回是否被拦截 */
  navigate(url: string): boolean {
    const event: NavigateEvent = {
      url,
      defaultPrevented: false,
      preventDefault() {
        event.defaultPrevented = true;
      },
    };
    for (const listener of this._listeners['will-navigate'] ?? []) {
      listener(event);
    }
    if (!event.defaultPrevented) {
      this.url = url;
    }
    return event.defaultPrevented;
  }

  send(...args: unknown[]): void {
    BrowserWindow.sent.push([this._winId, ...args]);
  }

  openDevTools(): void {
    BrowserWindow.devtools++;
  }
}

export class BrowserWindow {
  static seq = 0;
  static sent: unknown[][] = [];
  static devtools = 0;
  static focused: number[] = [];

  static loadError: Error | undefined;

  id: number;
  url: string | undefined;
  file: string | undefined;
  options: BrowserWindowConstructorOptions;
  webContents: WebContents;

  private _size: [number, number];
  private _position: [number, number];
  private _title: string;
  private _visible: boolean;
  private _destroyed = false;
  private _maximized = false;
  private _fullScreen = false;
  private _listeners: Record<string, ((...args: any[]) => void)[]> = {};

  constructor(options: BrowserWindowConstructorOptions = {}) {
    this.options = options;
    this.id = ++BrowserWindow.seq;
    this._size = [options.width ?? 800, options.height ?? 600];
    this._position = [options.x ?? 0, options.y ?? 0];
    this._title = options.title ?? '';
    this._visible = options.show !== false;
    this.webContents = new WebContents(1000 + this.id, this.id);
  }

  static reset(): void {
    BrowserWindow.seq = 0;
    BrowserWindow.sent = [];
    BrowserWindow.devtools = 0;
    BrowserWindow.focused = [];
    BrowserWindow.loadError = undefined;
  }

  getSize(): [number, number] {
    return [...this._size];
  }

  setSize(width: number, height: number): void {
    this._size = [width, height];
  }

  getPosition(): [number, number] {
    return [...this._position];
  }

  setPosition(x: number, y: number): void {
    this._position = [x, y];
  }

  getTitle(): string {
    return this._title;
  }

  setTitle(title: string): void {
    this._title = title;
  }

  isVisible(): boolean {
    return this._visible;
  }

  show(): void {
    this._visible = true;
  }

  hide(): void {
    this._visible = false;
  }

  isDestroyed(): boolean {
    return this._destroyed;
  }

  getNormalBounds(): Rectangle {
    const [x, y] = this._position;
    const [width, height] = this._size;
    return { x, y, width, height };
  }

  isMaximized(): boolean {
    return this._maximized;
  }

  maximize(): void {
    this._maximized = true;
    this._visible = true;
    this.emit('maximize');
  }

  isFullScreen(): boolean {
    return this._fullScreen;
  }

  setFullScreen(flag: boolean): void {
    this._fullScreen = flag;
  }

  isMinimized(): boolean {
    return false;
  }

  restore(): void {
    this._visible = true;
  }

  focus(): void {
    BrowserWindow.focused.push(this.id);
  }

  center(): void {
    this._position = [100, 100];
  }

  close(): void {
    this.emit('close');
    this._visible = false;
    this.emit('closed');
    this._destroyed = true;
  }

  async loadURL(url: string): Promise<void> {
    this.url = url;
    this.webContents.url = url;
    if (BrowserWindow.loadError) {
      throw BrowserWindow.loadError;
    }
  }

  async loadFile(file: string): Promise<void> {
    this.file = file;
    this.webContents.url = `file://${file}`;
    if (BrowserWindow.loadError) {
      throw BrowserWindow.loadError;
    }
  }

  on(event: string, listener: (...args: any[]) => void): this {
    (this._listeners[event] ||= []).push(listener);
    return this;
  }

  once(event: string, listener: (...args: any[]) => void): this {
    return this.on(event, listener);
  }

  emit(event: string, ...args: unknown[]): void {
    // 先拷贝, 回调里可能会移除自身 (once)
    for (const listener of (this._listeners[event] ?? []).slice()) {
      listener(...args);
    }
  }
}
