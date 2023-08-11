import { Ipc } from '@quiteer/electron-ipc'
import preload from '@quiteer/electron-preload'
import { BrowserWindow, app } from 'electron'
import { Common } from './utils/common'

app.whenReady().then(() => {
  Ipc.init()

  const win = new BrowserWindow({
    height: 700,
    width: 800,
    webPreferences: {
      preload: preload as string
    }
  })

  const child = new BrowserWindow({
    parent: win,
    height: 730,
    width: 700,
    frame: false,
    show: false,
    webPreferences: {
      preload: preload as string
    }
  })

  win.loadURL(Common.loadUrl)
  child.loadURL('https://freegpt.one/')

  win.webContents.openDevTools({ mode: 'right' })
  win.once('ready-to-show', () => {
    setTimeout(() => {
      const [x, y] = win.getPosition()
      child.setPosition(x + 810, y + 1)
      // child.show()
    }, 1000)
  })

  win.on('will-move', (event, newBounds) => {
    child.setPosition(newBounds.x + 810, newBounds.y + 1)
  })
})
