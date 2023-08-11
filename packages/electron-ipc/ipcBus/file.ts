import { basename, dirname, extname, join, parse, relative, resolve } from 'node:path'
import { IpcFileOptions } from '../event-enum/options'

export const ipcBus = new Map<IpcFileOptions, (event: Electron.IpcMainInvokeEvent, ...args: any[]) => void>()

ipcBus.set(IpcFileOptions.BASENAME, (_, path: string, suffix?: string) => basename(path, suffix))
ipcBus.set(IpcFileOptions.DIRNAME, (_, path: string) => dirname(path))
ipcBus.set(IpcFileOptions.EXTNAME, (_, path: string) => extname(path))
ipcBus.set(IpcFileOptions.JOIN, (_, ...paths: string[]) => join(...paths))
ipcBus.set(IpcFileOptions.PARSE, (_, path: string) => parse(path))
ipcBus.set(IpcFileOptions.RELATIVE, (_, from: string, to: string) => relative(from, to))
ipcBus.set(IpcFileOptions.RESOLVE, (_, ...paths: string[]) => resolve(...paths))

