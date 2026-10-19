import { contextBridge } from 'electron'

contextBridge.exposeInMainWorld('electronupPreload', {
  platform: process.platform,
  versions: process.versions,
})
