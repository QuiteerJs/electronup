import type { Tray } from 'electron'
import { getTrayState } from './tray'
import type { TrayController } from './types'

/**
 * 托盘仓库: 名称 <-> 托盘映射, 托盘销毁自动摘除
 *
 * 持有引用本身就是必要的 —— Tray 实例一旦被回收, 系统托盘图标会直接消失
 */
export class TrayStore<N extends string = string, S extends string = string> {
  #controllers: Map<N, TrayController<N, S>> = new Map()

  /** 当前已注册托盘数量 */
  get size(): number {
    return this.#controllers.size
  }

  /** 所有已注册托盘名称 */
  names(): N[] {
    return [...this.#controllers.keys()]
  }

  /** 所有存活的原生托盘实例 */
  list(): Tray[] {
    return this.entries().map(([, controller]) => controller.target)
  }

  /** [名称, 句柄] 列表 */
  entries(): [N, TrayController<N, S>][] {
    const result: [N, TrayController<N, S>][] = []
    for (const [name, controller] of this.#controllers) {
      if (this.#isAlive(controller))
        result.push([name, controller])
    }
    return result
  }

  /**
   * 注册托盘, 同名托盘会被覆盖映射 (旧托盘不会被销毁)
   */
  register(name: N, controller: TrayController<N, S>): TrayController<N, S> {
    const tray = controller.target
    if (tray.isDestroyed())
      return controller

    const prev = this.#controllers.get(name)
    // 旧控制器不再摘除映射, 否则旧托盘销毁时会误删新注册的记录
    if (prev && prev.target !== tray)
      getTrayState(prev).onDestroy = undefined

    this.#controllers.set(name, controller)
    getTrayState(controller).onDestroy = (key) => {
      if (this.#controllers.get(key)?.target === tray)
        this.remove(key)
    }

    return controller
  }

  /** 按名取控制句柄 */
  getController(name: N): TrayController<N, S> | undefined {
    const controller = this.#controllers.get(name)
    if (!controller)
      return undefined
    if (!this.#isAlive(controller)) {
      this.remove(name)
      return undefined
    }
    return controller
  }

  /** 按名取原生托盘实例 */
  get(name: N): Tray | undefined {
    return this.getController(name)?.target
  }

  /** 按条件查找控制句柄 */
  find(predicate: (controller: TrayController<N, S>, name: N) => boolean): TrayController<N, S> | undefined {
    for (const [name, controller] of this.entries()) {
      if (predicate(controller, name))
        return controller
    }
    return undefined
  }

  has(name: N): boolean {
    return this.getController(name) !== undefined
  }

  /** 摘除注册 (不销毁托盘) */
  remove(name: N): boolean {
    const controller = this.#controllers.get(name)
    if (!controller)
      return false
    this.#controllers.delete(name)
    getTrayState(controller).onDestroy = undefined
    return true
  }

  /** 清空注册表 (不销毁托盘) */
  clear(): void {
    for (const controller of this.#controllers.values())
      getTrayState(controller).onDestroy = undefined
    this.#controllers.clear()
  }

  /** 销毁并摘除所有托盘 */
  destroyAll(): void {
    for (const [, controller] of this.entries())
      controller.destroy()
    this.#controllers.clear()
  }

  #isAlive(controller: TrayController<N, S>): boolean {
    return !controller.target.isDestroyed()
  }
}
