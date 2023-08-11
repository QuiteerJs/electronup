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
      console.log(`getting ${key}!`)
      return Reflect.get(target, key, receiver)
    },
    set(target, key: string, value: any, receiver) {
      switch (key) {
        case 'width':
          win.setSize(value, win.getSize()[1])
          break
        case 'height':
          win.setSize(win.getSize()[0], value)
          break
        case 'x':
          win.setSize(win.getSize()[0], value)
          break
        case 'y':
          win.setSize(win.getSize()[0], value)
          break
        case 'center':
          win.setSize(win.getSize()[0], value)
          break
        case 'title':
          win.setSize(win.getSize()[0], value)
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
  console.log('store: ', store)
  return (options: Options) => createBrowserWindow(options)
}
