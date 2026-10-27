import { ipcRenderer } from 'electron';

export interface PreloadIpc {
  send<T extends Array<any>>(channel: string, ...args: T): void;
  /**
   * 描述  可以用,但是用invoke要好的多
   * @date 2022-11-14
   * @param {any}
   * @returns {any}
   */
  sendSync<T extends Array<any>>(channel: string, ...args: T): any;
  invoke<T extends Array<any>, R = any>(channel: string, ...args: T): Promise<R>;
  on(
    channel: string,
    listener: (event: Electron.IpcRendererEvent, ...args: any[]) => void,
  ): Electron.IpcRenderer;
  once(
    channel: string,
    listener: (event: Electron.IpcRendererEvent, ...args: any[]) => void,
  ): Electron.IpcRenderer;
  removeAllListeners(channel?: string): Electron.IpcRenderer;
}

export const $ipc: PreloadIpc = {
  send: (...args) => ipcRenderer.send(...args),
  sendSync: (...args) => ipcRenderer.sendSync(...args),
  invoke: (...args) => ipcRenderer.invoke(...args),
  on: (...args) => ipcRenderer.on(...args),
  once: (...args) => ipcRenderer.once(...args),
  removeAllListeners: (...args) => ipcRenderer.removeAllListeners(...args),
};
