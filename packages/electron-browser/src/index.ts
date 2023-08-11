import { WinStore } from './store'
import { create } from './createBroseWindow'

let once = true

export function init<T extends string>() {
  if (!once)
    throw new Error('初始化一次就好！')

  once = false

  const store = new WinStore<T>()

  const createBrowserWindow = create(store)

  return { store, createBrowserWindow }
}

const { store } = init<'main' | 'child'>()
console.log('store: ', store)
store.setWin('child', 1)
