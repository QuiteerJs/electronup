/**
 * 测试替身: 最小可用的 contextBridge / ipcRenderer / clipboard / webFrame
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

export const clipboard = {
  text: '',
  clear() {
    this.text = '';
  },
  async has(_mimetype: string) {
    return this.text !== '';
  },
  async read() {
    return [];
  },
  async readText() {
    return this.text;
  },
  async write(_data: unknown[]) {},
  async writeText(text: string) {
    this.text = text;
  },
};

export const webFrame = {
  zoomFactor: 1,
  setZoomFactor(factor: number) {
    this.zoomFactor = factor;
  },
  getZoomFactor() {
    return this.zoomFactor;
  },
  routingId: 7,
  parent: null,
};
