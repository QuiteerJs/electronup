/**
 * 测试用 Electron 替身
 *
 * 仅在打包测试时通过 tsdown alias 注入, 不参与发布
 */

export interface StubMenuItemOptions {
  id?: string
  label?: string
  sublabel?: string
  enabled?: boolean
  visible?: boolean
  checked?: boolean
  accelerator?: string | null
  icon?: unknown
  toolTip?: string
  type?: string
  role?: string
  click?: (...args: unknown[]) => void
  submenu?: StubMenuItemOptions[]
  [key: string]: unknown
}

export class MenuItem {
  id = ''
  label = ''
  sublabel = ''
  enabled = true
  visible = true
  checked = false
  accelerator: string | null = null
  toolTip = ''
  type = 'normal'
  click: ((...args: unknown[]) => void) | undefined = undefined
  submenu: Menu | undefined = undefined
  menu: Menu | undefined = undefined
  commandId = 0

  constructor(options: StubMenuItemOptions = {}) {
    const { submenu, ...rest } = options
    Object.assign(this, rest)
    if (Array.isArray(submenu))
      this.submenu = Menu.buildFromTemplate(submenu)
  }
}

export class Menu {
  items: MenuItem[] = []
  popped: unknown[] = []
  closed = 0
  listeners: Record<string, ((...args: unknown[]) => void)[]> = {}

  /** setApplicationMenu 调用次数, 用于验证平台刷新差异 */
  static applyCount = 0
  /** buildFromTemplate 调用次数, 用于验证重建 */
  static built = 0
  static applicationMenu: Menu | null = null

  static buildFromTemplate(template: StubMenuItemOptions[]): Menu {
    Menu.built++
    const menu = new Menu()
    menu.items = template.map((options) => {
      const item = options instanceof MenuItem ? options : new MenuItem(options)
      item.menu = menu
      return item
    })
    return menu
  }

  static setApplicationMenu(menu: Menu | null): void {
    Menu.applyCount++
    Menu.applicationMenu = menu
  }

  static getApplicationMenu(): Menu | null {
    return Menu.applicationMenu
  }

  static reset(): void {
    Menu.applyCount = 0
    Menu.built = 0
    Menu.applicationMenu = null
  }

  append(item: MenuItem): void {
    this.items.push(item)
    item.menu = this
  }

  insert(pos: number, item: MenuItem): void {
    this.items.splice(pos, 0, item)
    item.menu = this
  }

  getMenuItemById(id: string): MenuItem | null {
    for (const item of this.items) {
      if (item.id === id)
        return item
      const nested = item.submenu?.getMenuItemById(id) ?? null
      if (nested)
        return nested
    }
    return null
  }

  popup(options?: unknown): void {
    this.popped.push(options)
  }

  closePopup(): void {
    this.closed++
  }

  on(event: string, listener: (...args: unknown[]) => void): this {
    (this.listeners[event] ||= []).push(listener)
    return this
  }

  once(event: string, listener: (...args: unknown[]) => void): this {
    return this.on(event, listener)
  }

  off(event: string, listener: (...args: unknown[]) => void): this {
    this.listeners[event] = (this.listeners[event] ?? []).filter(fn => fn !== listener)
    return this
  }
}

export const app = {
  dock: {
    menu: null as Menu | null,
    setMenu(menu: Menu): void {
      app.dock.menu = menu
    }
  }
}
