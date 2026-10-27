/**
 * 测试替身: 最小可用的 ipcMain / BrowserWindow 实现
 * 仅在 test 打包时通过 alias 替换 electron, 不参与产物构建
 */

export interface WebFrameMain {
  url: string;
  parent: WebFrameMain | null;
}

export interface IpcMainEvent {
  sender: WebContents;
  senderFrame: WebFrameMain | null;
}

export type IpcMainInvokeEvent = IpcMainEvent;

type Listener = (event: IpcMainEvent, ...args: any[]) => void;
type Handler = (event: IpcMainInvokeEvent, ...args: any[]) => unknown;

export class WebContents {
  static all: WebContents[] = [];

  /** 发起调用的 frame, 测试里可改成子 frame / 其他来源 / null */
  frame: WebFrameMain | null = { url: 'file:///index.html', parent: null };
  destroyed = false;
  /** 收到的推送 */
  sent: Array<[string, ...unknown[]]> = [];

  constructor(public id: number) {
    WebContents.all.push(this);
  }

  isDestroyed() {
    return this.destroyed;
  }
  send(channel: string, ...args: unknown[]) {
    this.sent.push([channel, ...args]);
  }
}

export const webContents = {
  getAllWebContents: () => [...WebContents.all],
};

export const ipcMain = {
  listeners: new Map<string, Listener[]>(),
  handlers: new Map<string, Handler>(),

  on(channel: string, listener: Listener) {
    this.listeners.set(channel, [...(this.listeners.get(channel) ?? []), listener]);
    return this;
  },
  removeListener(channel: string, listener: Listener) {
    this.listeners.set(
      channel,
      (this.listeners.get(channel) ?? []).filter((item) => item !== listener),
    );
    return this;
  },
  handle(channel: string, handler: Handler) {
    if (this.handlers.has(channel)) {
      throw new Error(`Attempted to register a second handler for '${channel}'`);
    }
    this.handlers.set(channel, handler);
  },
  removeHandler(channel: string) {
    this.handlers.delete(channel);
  },

  /** 模拟渲染层 send */
  emit(channel: string, sender: WebContents, ...args: unknown[]) {
    this.emitFrom(sender.frame, channel, sender, ...args);
  },
  /** 模拟指定 frame 发起的 send */
  emitFrom(frame: WebFrameMain | null, channel: string, sender: WebContents, ...args: unknown[]) {
    for (const listener of this.listeners.get(channel) ?? []) {
      listener({ sender, senderFrame: frame }, ...args);
    }
  },
  /** 模拟渲染层 invoke */
  async invoke(channel: string, sender: WebContents, ...args: unknown[]) {
    return this.invokeFrom(sender.frame, channel, sender, ...args);
  },
  /** 模拟指定 frame 发起的 invoke */
  async invokeFrom(
    frame: WebFrameMain | null,
    channel: string,
    sender: WebContents,
    ...args: unknown[]
  ) {
    const handler = this.handlers.get(channel);
    if (!handler) {
      throw new Error(`No handler registered for '${channel}'`);
    }
    return handler({ sender, senderFrame: frame }, ...args);
  },
  reset() {
    this.listeners.clear();
    this.handlers.clear();
  },
};

export class BrowserWindow {
  static all: BrowserWindow[] = [];

  static fromWebContents(contents: WebContents): BrowserWindow | null {
    return BrowserWindow.all.find((win) => win.webContents === contents) ?? null;
  }

  webContents: WebContents;
  title = '';
  destroyed = false;
  focused = false;
  maximized = false;
  minimized = false;
  fullScreen = false;
  resizable = true;
  alwaysOnTop = false;
  calls: string[] = [];

  constructor() {
    this.webContents = new WebContents(BrowserWindow.all.length + 1);
    BrowserWindow.all.push(this);
  }

  isDestroyed() {
    return this.destroyed;
  }
  destroy() {
    this.destroyed = true;
  }
  close() {
    this.calls.push('close');
  }
  show() {
    this.calls.push('show');
  }
  hide() {
    this.calls.push('hide');
  }
  reload() {
    this.calls.push('reload');
  }
  flashFrame(flag: boolean) {
    this.calls.push(`flashFrame:${flag}`);
  }
  setTitle(title: string) {
    this.title = title;
  }
  isFocused() {
    return this.focused;
  }
  focus() {
    this.focused = true;
  }
  blur() {
    this.focused = false;
  }
  isMaximized() {
    return this.maximized;
  }
  maximize() {
    this.maximized = true;
  }
  unmaximize() {
    this.maximized = false;
  }
  isMinimized() {
    return this.minimized;
  }
  minimize() {
    this.minimized = true;
  }
  restore() {
    this.minimized = false;
  }
  isFullScreen() {
    return this.fullScreen;
  }
  setFullScreen(flag: boolean) {
    this.fullScreen = flag;
  }
  isResizable() {
    return this.resizable;
  }
  setResizable(flag: boolean) {
    this.resizable = flag;
  }
  isMovable() {
    return true;
  }
  setMovable(_flag: boolean) {}
  isMinimizable() {
    return true;
  }
  setMinimizable(_flag: boolean) {}
  isMaximizable() {
    return true;
  }
  setMaximizable(_flag: boolean) {}
  isAlwaysOnTop() {
    return this.alwaysOnTop;
  }
  setAlwaysOnTop(flag: boolean) {
    this.alwaysOnTop = flag;
  }
}
