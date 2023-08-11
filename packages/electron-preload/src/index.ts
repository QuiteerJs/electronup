import { contextBridge } from 'electron'
import type { PreloadIpc } from './ipcRenderer'
import type { PreloadClipboard } from './clipboard'
import { $clipboard } from './clipboard'
import { $ipc } from './ipcRenderer'
import type { PreloadWebFrame } from './webFrame'
import { $webFrame } from './webFrame'

contextBridge.exposeInMainWorld('$ipc', $ipc)
contextBridge.exposeInMainWorld('$clipboard', $clipboard)
contextBridge.exposeInMainWorld('$webFrame', $webFrame)

export type { PreloadIpc, PreloadClipboard, PreloadWebFrame }

