import { resolve } from 'path'
import { BrowserWindow, app } from 'electron'
import { Ipc } from '@quiteer/electron-ipc'

const loadUrl = process.env.NODE_ENV === 'development'
  ? `http://localhost:${process.env.RENDER_PORT}`
  : `file://${resolve(__dirname, 'index.html')}`

app.whenReady().then(() => {
  Ipc.init()
  const win = new BrowserWindow({
    height: 700, width: 1000
  })

  console.log('loadUrl: ', loadUrl)
  console.log('NODE_ENV', process.env.NODE_ENV)
  console.log('VITE_HELLO :>> ', process.env.VITE_HELLO)
  console.log('VITE_MODE_TEXT :>> ', process.env.VITE_MODE_TEXT)

  win.loadURL(loadUrl)
  win.webContents.openDevTools({ mode: 'right' })
  // appApiLogs()
})

function appApiLogs() {
  console.log('app.getVersion(): ', app.getVersion())
  console.log('app.getAppPath(): ', app.getAppPath())
  console.log('app.getName(): ', app.getName())
  console.log('app.getLocale(): ', app.getLocale())
  console.log('app.getSystemLocale(): ', app.getSystemLocale())
  console.log('app.getLocaleCountryCode(): ', app.getLocaleCountryCode())
  console.log('app.hasSingleInstanceLock(): ', app.hasSingleInstanceLock())
  console.log('app.getAppMetrics(): ', app.getAppMetrics())
  console.log('app.getGPUFeatureStatus(): ', app.getGPUFeatureStatus())
  console.log('app.getBadgeCount(): ', app.getBadgeCount())
  console.log('app.isEmojiPanelSupported(): ', app.isEmojiPanelSupported())
  app.showEmojiPanel()
  console.log('app.commandLine: ', app.commandLine)
  console.log('app.dock: ', app.dock)
  console.log('app.isPackaged: ', app.isPackaged)
  console.log('app.name: ', app.name)
  console.log('app.userAgentFallback: ', app.userAgentFallback)
}
