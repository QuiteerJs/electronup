import { BrowserWindow } from 'electron'
import type { WinStore } from './store'

export interface Options extends Electron.BrowserWindowConstructorOptions {
  _name: string
}
export type BackOptions = Options & { target: Electron.BrowserWindow }

function createBrowserWindow(options: Options): BackOptions {
  const win = new BrowserWindow(options)

  return new Proxy({ ...options, target: win }, {
    get(target, key: string, receiver) {
      return Reflect.get(target, key, receiver)
    },
    set(target, key: string, value: any, receiver) {
      switch (key) {
        case 'width': {
          const [, height] = win.getSize()
          win.setSize(value, height)
          break
        }
        case 'height': {
          const [width] = win.getSize()
          win.setSize(width, value)
          break
        }
        case 'x':
        case 'y': {
          const [x, y] = win.getPosition()
          win.setPosition(key === 'x' ? value : x, key === 'y' ? value : y)
          break
        }
        case 'center':
          if (value)
            win.center()
          break
        case 'title':
          win.setTitle(value)
          break
        case 'show':
          value ? win.show() : win.hide()
          break
      }

      return Reflect.set(target, key, value, receiver)
    }
  })
}

export const create = (store: WinStore<string>) => {
  return (options: Options): BackOptions => {
    const back = createBrowserWindow(options)
    store.setWin(options._name, back.target.id)
    return back
  }
}
