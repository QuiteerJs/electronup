import { ipcMain } from 'electron'
import type { IpcFileOptions, IpcWindowOptions } from './event-enum/options'
import { EventKeys } from './event-enum/eventKays'
import { fileBus, windowBus } from './ipcBus'

class IpcOpt {
  static #instance: IpcOpt | null = null
  constructor() { }

  static getInstance() {
    if (!this.#instance)
      return (this.#instance = new IpcOpt())
    else
      return this.#instance
  }

  init() {
    this.#window()
  }

  destroy() {
    ipcMain.removeAllListeners(EventKeys.WindowOptionsKey)
    ipcMain.removeHandler(EventKeys.FileOptionsKey)
  }

  #window() {
    ipcMain.on(EventKeys.WindowOptionsKey, (event: Electron.IpcMainEvent, type: IpcWindowOptions, args) => {
      const performFunc = windowBus.get(type)
      if (performFunc instanceof Function)
        return performFunc(event, args)
    })

    ipcMain.handle(EventKeys.FileOptionsKey, (event: Electron.IpcMainInvokeEvent, type: IpcFileOptions, ...args: any[]) => {
      const performFunc = fileBus.get(type)
      if (performFunc instanceof Function)
        return performFunc(event, args)

      throw new Error('未查找到事件相应！')
    })
  }
}

export const Ipc = IpcOpt.getInstance()
