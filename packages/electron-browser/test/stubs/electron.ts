/**
 * 测试替身: 最小可用的 BrowserWindow / WebContents 实现
 * 仅在 test 打包时通过 alias 替换 electron, 不参与产物构建
 */

export interface BrowserWindowConstructorOptions {
  width?: number;
  height?: number;
  show?: boolean;
  [key: string]: unknown;
}

export class WebContents {
  id: number;
  private _winId: number;

  constructor(id: number, winId: number) {
    this.id = id;
    this._winId = winId;
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

  id: number;
  url: string | undefined;
  webContents: WebContents;

  private _size: [number, number];
  private _position: [number, number];
  private _title: string;
  private _visible: boolean;
  private _destroyed = false;
  private _listeners: Record<string, ((...args: any[]) => void)[]> = {};

  constructor(options: Record<string, any> = {}) {
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
    this._visible = false;
    this.emit('closed');
    this._destroyed = true;
  }

  loadURL(url: string): void {
    this.url = url;
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
