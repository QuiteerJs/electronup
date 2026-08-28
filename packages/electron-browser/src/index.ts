import { WinStore } from './store'
import { create } from './createBroseWindow'

export type { BackOptions, Options } from './createBroseWindow'
export { WinStore }

export function init<T extends string>() {
  const store = new WinStore<T>()
  const createBrowserWindow = create(store)

  return { store, createBrowserWindow }
}
