import type { Menu as MenuType } from 'electron'
import { getMenuState } from './menu'
import type { MenuController } from './types'

/**
 * 菜单仓库: 名称 <-> 菜单映射
 *
 * 持有引用本身就是必要的 —— Menu 实例一旦被回收, 已应用的菜单与已注册的
 * 快捷键都会随之失效
 */
export class MenuStore<N extends string = string> {
  #controllers: Map<N, MenuController<N>> = new Map()

  /** 当前已注册菜单数量 */
  get size(): number {
    return this.#controllers.size
  }

  /** 所有已注册菜单名称 */
  names(): N[] {
    return [...this.#controllers.keys()]
  }

  /** 所有原生菜单实例 */
  list(): MenuType[] {
    return this.entries().map(([, controller]) => controller.target)
  }

  /** [名称, 控制句柄] 列表 */
  entries(): [N, MenuController<N>][] {
    return [...this.#controllers]
  }

  /**
   * 注册菜单, 同名菜单会被覆盖映射 (旧菜单不会被销毁)
   */
  register(name: N, controller: MenuController<N>): MenuController<N> {
    const prev = this.#controllers.get(name)
    // 旧控制句柄不再摘除映射, 否则旧菜单 destroy() 时会误删新注册的记录
    if (prev && prev !== controller)
      getMenuState(prev).onDestroy = undefined

    this.#controllers.set(name, controller)
    getMenuState(controller).onDestroy = (key) => {
      if (this.#controllers.get(key) === controller)
        this.remove(key)
    }

    return controller
  }

  /** 按名取控制句柄 */
  getController(name: N): MenuController<N> | undefined {
    return this.#controllers.get(name)
  }

  /** 按名取原生菜单实例 */
  get(name: N): MenuType | undefined {
    return this.#controllers.get(name)?.target
  }

  /** 按条件查找控制句柄 */
  find(predicate: (controller: MenuController<N>, name: N) => boolean): MenuController<N> | undefined {
    for (const [name, controller] of this.entries()) {
      if (predicate(controller, name))
        return controller
    }
    return undefined
  }

  has(name: N): boolean {
    return this.#controllers.has(name)
  }

  /** 摘除注册 */
  remove(name: N): boolean {
    const controller = this.#controllers.get(name)
    if (!controller)
      return false
    this.#controllers.delete(name)
    getMenuState(controller).onDestroy = undefined
    return true
  }

  /** 清空注册表 */
  clear(): void {
    for (const controller of this.#controllers.values())
      getMenuState(controller).onDestroy = undefined
    this.#controllers.clear()
  }

  /** 摘除所有菜单注册 */
  destroyAll(): void {
    for (const [, controller] of this.entries())
      controller.destroy()
    this.#controllers.clear()
  }
}
