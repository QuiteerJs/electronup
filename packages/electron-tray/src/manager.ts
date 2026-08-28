import type { DisplayBalloonOptions, Menu, Tray } from 'electron'
import { TrayStore } from './store'
import { createTray, createTrayState, toController } from './tray'
import type { TrayController, TrayIconSource, TrayMenuTemplate, TrayOptions } from './types'

export interface TrayManager<N extends string = string, S extends string = string> {
  /** 托盘仓库 */
  store: TrayStore<N, S>
  /** 已注册托盘数量 */
  readonly size: number
  /** 创建托盘并注册 */
  create: (options: TrayOptions<N, S>) => TrayController<N, S>
  /** 把外部创建的托盘纳入管理 */
  register: (name: N, tray: Tray) => TrayController<N, S>
  /** 按名取原生托盘实例 */
  get: (name: N) => Tray | undefined
  /** 按名取控制句柄 */
  getController: (name: N) => TrayController<N, S> | undefined
  /** 按名取原生托盘实例, 不存在时抛错 */
  getOrThrow: (name: N) => Tray
  /** 切换图标状态 */
  setState: (name: N, state: S) => boolean
  /** 直接换图标 */
  setIcon: (name: N, icon: TrayIconSource) => boolean
  /** 更新悬停提示 */
  setTooltip: (name: N, tooltip: string) => boolean
  /** 更新右键菜单 */
  setMenu: (name: N, menu: TrayMenuTemplate<N, S> | Menu | null) => boolean
  /** 按模板重建菜单 */
  refreshMenu: (name: N) => boolean
  /** 弹出气泡通知, 仅 Windows */
  balloon: (name: N, options: DisplayBalloonOptions) => boolean
  has: (name: N) => boolean
  /** 销毁托盘并摘除注册 */
  destroy: (name: N) => boolean
  /** 销毁所有托盘 */
  destroyAll: () => void
  /** 所有存活的原生托盘实例 */
  list: () => Tray[]
  /** 所有托盘名称 */
  names: () => N[]
}

/**
 * 创建托盘管理器
 *
 * @example
 * ```ts
 * export const trays = createTrayManager<'main', 'idle' | 'syncing'>()
 *
 * trays.create({
 *   name: 'main',
 *   icon: { idle: 'icons/idle.png', syncing: 'icons/syncing.png' },
 *   onClick: ({ tray }) => tray.state = 'syncing'
 * })
 * ```
 */
export function createTrayManager<N extends string = string, S extends string = string>(): TrayManager<N, S> {
  const store = new TrayStore<N, S>()

  const withController = (name: N, fn: (controller: TrayController<N, S>) => void): boolean => {
    const controller = store.getController(name)
    if (!controller)
      return false
    fn(controller)
    return true
  }

  const create = (options: TrayOptions<N, S>): TrayController<N, S> => {
    const strategy = options.conflict ?? 'reuse'
    const existing = store.getController(options.name)

    if (existing) {
      if (strategy === 'error')
        throw new Error(`[electron-tray] 托盘 "${options.name}" 已存在`)
      if (strategy === 'reuse')
        return existing
      store.remove(options.name)
      if (!existing.target.isDestroyed())
        existing.target.destroy()
    }

    return store.register(options.name, createTray(options))
  }

  const getOrThrow = (name: N): Tray => {
    const tray = store.get(name)
    if (!tray)
      throw new Error(`[electron-tray] 托盘 "${name}" 不存在或已销毁`)
    return tray
  }

  const destroy = (name: N): boolean => {
    const controller = store.getController(name)
    if (!controller)
      return false
    controller.destroy()
    return true
  }

  return {
    store,
    get size() {
      return store.size
    },
    create,
    register: (name, tray) => store.register(name, toController(tray, createTrayState<N, S>(name))),
    get: name => store.get(name),
    getController: name => store.getController(name),
    getOrThrow,
    setState: (name, state) => withController(name, controller => controller.state = state),
    setIcon: (name, icon) => withController(name, controller => controller.icon = icon),
    setTooltip: (name, tooltip) => withController(name, controller => controller.tooltip = tooltip),
    setMenu: (name, menu) => withController(name, controller => controller.menu = menu),
    refreshMenu: name => withController(name, controller => controller.refreshMenu()),
    balloon: (name, options) => store.getController(name)?.balloon(options) ?? false,
    has: name => store.has(name),
    destroy,
    destroyAll: () => store.destroyAll(),
    list: () => store.list(),
    names: () => store.names()
  }
}
