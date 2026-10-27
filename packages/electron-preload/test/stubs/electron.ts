/**
 * 测试替身: 最小可用的 contextBridge / ipcRenderer / webFrame / ipcMain / clipboard
 * 仅在 test 打包时通过 alias 替换 electron, 不参与产物构建
 */
import { EventEmitter } from 'node:events';

export interface IpcRendererEvent {
  sender: typeof ipcRenderer;
  ports: unknown[];
}

export const exposed: Record<string, any> = {};

export const contextBridge = {
  exposeInMainWorld(key: string, api: unknown) {
    exposed[key] = api;
  },
};

class StubIpcRenderer extends EventEmitter {
  sent: unknown[][] = [];

  send(channel: string, ...args: unknown[]) {
    this.sent.push([channel, ...args]);
  }
  sendSync(channel: string, ...args: unknown[]) {
    return { channel, args };
  }
  async invoke(channel: string, ...args: unknown[]) {
    return { channel, args };
  }
  /** 模拟主进程推送 */
  push(channel: string, ...args: unknown[]) {
    const event: IpcRendererEvent = { sender: this, ports: [] };
    this.emit(channel, event, ...args);
  }
}

export const ipcRenderer = new StubIpcRenderer();

export const webFrame = {
  zoomFactor: 1,
  setZoomFactor(factor: number) {
    this.zoomFactor = factor;
  },
  getZoomFactor() {
    return this.zoomFactor;
  },
};

/** 主进程侧 */

export interface WebFrameMain {
  parent: WebFrameMain | null;
}

export interface IpcMainInvokeEvent {
  senderFrame: WebFrameMain | null;
}

type Handler = (event: IpcMainInvokeEvent, ...args: any[]) => unknown;

export const ipcMain = {
  handlers: new Map<string, Handler>(),
  handle(channel: string, handler: Handler) {
    if (this.handlers.has(channel)) {
      throw new Error(`Attempted to register a second handler for '${channel}'`);
    }
    this.handlers.set(channel, handler);
  },
  removeHandler(channel: string) {
    this.handlers.delete(channel);
  },
  /** 模拟渲染层 invoke, 默认来自主 frame */
  async invoke(channel: string, frame: WebFrameMain | null = { parent: null }, ...args: unknown[]) {
    const handler = this.handlers.get(channel);
    if (!handler) {
      throw new Error(`No handler registered for '${channel}'`);
    }
    return handler({ senderFrame: frame }, ...args);
  },
};

export class ClipboardItem {
  constructor(public items: Record<string, unknown>) {}
  get types() {
    return Object.keys(this.items);
  }
  async getType(type: string) {
    return this.items[type];
  }
}

function createClipboard() {
  return {
    items: [] as ClipboardItem[],
    clear() {
      this.items = [];
    },
    async has(mimetype: string) {
      return this.items.some((item) => item.types.includes(mimetype));
    },
    async read() {
      return this.items;
    },
    async readText() {
      const text = this.items[0]?.items['text/plain'];
      return typeof text === 'string' ? text : '';
    },
    async write(data: ClipboardItem[]) {
      this.items = data;
    },
    async writeText(text: string) {
      this.items = [new ClipboardItem({ 'text/plain': text })];
    },
  };
}

export const clipboard = Object.assign(createClipboard(), { selection: createClipboard() });
