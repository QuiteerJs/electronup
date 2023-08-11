import type { IpcRenderer } from 'electron'
import { ipcRenderer } from 'electron'

type IpcParameters<K extends keyof IpcRenderer> = Parameters<IpcRenderer[K]>
type IpcReturnType<K extends keyof IpcRenderer> = ReturnType<IpcRenderer[K]>

export interface PreloadIpc {
  send<T extends Array<any>>(channel: string, ...args: T): void
  /**
   * 描述  可以用,但是用invoke要好的多
   * @date 2022-11-14
   * @param {any}
   * @returns {any}
   */
  sendSync<T extends Array<any>>(channel: string, ...args: T): any
  invoke<T extends Array<any>, R = never>(channel: string, ...args: T): Promise<R>
  on(...args: IpcParameters<'on'>): IpcReturnType<'on'>
  once(...args: IpcParameters<'once'>): IpcReturnType<'once'>
  removeAllListeners(channel: string): IpcReturnType<'removeAllListeners'>
}

export const $ipc: PreloadIpc = {
  send: (...args) => ipcRenderer.send(...args),
  sendSync: (...args) => ipcRenderer.sendSync(...args),
  invoke: (...args) => ipcRenderer.invoke(...args),
  on: (channel, listener) => ipcRenderer.on(channel, listener),
  once: (...args) => ipcRenderer.once(...args),
  removeAllListeners: channel => ipcRenderer.removeAllListeners(channel)
}

