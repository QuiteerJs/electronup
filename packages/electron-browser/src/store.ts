import type { BrowserWindow, WebContents } from 'electron'
import type { WindowController } from './types'

/**
 * 窗口仓库: 名称 <-> 窗口双向映射, 窗口关闭自动摘除
 */
export class WinStore<N extends string = string> {
  #controllers: Map<N, WindowController<N>> = new Map()
  #names: Map<number, N> = new Map()

  /** 当前已注册窗口数量 */
  get size(): number {
    return this.#controllers.size
  }

  /** 所有已注册窗口名称 */
  names(): N[] {
    return [...this.#controllers.keys()]
  }

  /** 所有存活的窗口实例 */
  list(): BrowserWindow[] {
    return this.entries().map(([, controller]) => controller.target)
  }

  /** [名称, 句柄] 列表 */
  entries(): [N, WindowController<N>][] {
    const result: [N, WindowController<N>][] = []
    for (const [name, controller] of this.#controllers) {
      if (this.#isAlive(controller))
        result.push([name, controller])
    }
    return result
  }

  /**
   * 注册窗口, 同名窗口会被覆盖映射 (旧窗口不会被关闭)
   */
  register(name: N, controller: WindowController<N>): WindowController<N> {
    const win = controller.target
    if (win.isDestroyed())
      return controller

    const prev = this.#controllers.get(name)
    if (prev && prev.target !== win)
      this.#names.delete(prev.target.id)

    this.#controllers.set(name, controller)
    this.#names.set(win.id, name)

    win.once('closed', () => {
      // 仅当映射仍指向自己时才清理, 避免被覆盖注册后误删新映射
      if (this.#controllers.get(name)?.target === win)
        this.remove(name)
    })

    return controller
  }

  /** 按名取控制句柄 */
  getController(name: N): WindowController<N> | undefined {
    const controller = this.#controllers.get(name)
    if (!controller)
      return undefined
    if (!this.#isAlive(controller)) {
      this.remove(name)
      return undefined
    }
    return controller
  }

  /** 按名取窗口实例 */
  get(name: N): BrowserWindow | undefined {
    return this.getController(name)?.target
  }

  /** 按窗口 id 取控制句柄 */
  fromId(id: number): WindowController<N> | undefined {
    const name = this.#names.get(id)
    return name === undefined ? undefined : this.getController(name)
  }

  /** 按 webContents (或其 id) 反查控制句柄, 用于 ipc 回调里定位来源窗口 */
  fromWebContents(contents: WebContents | number): WindowController<N> | undefined {
    const id = typeof contents === 'number' ? contents : contents.id
    for (const [, controller] of this.entries()) {
      if (controller.target.webContents.id === id)
        return controller
    }
    return undefined
  }

  /** 取窗口名称 */
  getName(win: BrowserWindow | number): N | undefined {
    const id = typeof win === 'number' ? win : win.id
    return this.#names.get(id)
  }

  has(name: N): boolean {
    return this.getController(name) !== undefined
  }

  /** 摘除注册 (不关闭窗口) */
  remove(name: N): boolean {
    const controller = this.#controllers.get(name)
    if (!controller)
      return false
    this.#controllers.delete(name)
    this.#names.delete(controller.target.id)
    return true
  }

  /** 清空注册表 (不关闭窗口) */
  clear(): void {
    this.#controllers.clear()
    this.#names.clear()
  }

  /** 关闭并摘除所有窗口 */
  async closeAll(): Promise<void> {
    await Promise.all(this.list().map(win => new Promise<void>((resolve) => {
      if (win.isDestroyed()) {
        resolve()
        return
      }
      win.once('closed', () => resolve())
      win.close()
    })))
    this.clear()
  }

  #isAlive(controller: WindowController<N>): boolean {
    return !controller.target.isDestroyed()
  }
}
