import { createMenuManager } from './manager'

export type {
  MenuConflictStrategy,
  MenuController,
  MenuEvent,
  MenuEventListener,
  MenuEventObject,
  MenuItemHandle,
  MenuItemPatch,
  MenuKind,
  MenuOptions,
  MenuTemplate,
  MenuTemplateInput,
  MenuTemplateItem
} from './types'
export type { MenuState } from './menu'
export type { MenuManager } from './manager'
export { MenuStore } from './store'
export { createMenuManager } from './manager'
export { createMenu, createMenuState, getMenuState, toController } from './menu'
export { findItem, normalizeTemplate } from './path'

/**
 * 开箱即用的全局菜单管理器
 *
 * @example
 * ```ts
 * import { menus } from '@quiteer/electron-menu'
 *
 * menus.create({
 *   name: 'app',
 *   template: [
 *     { id: 'file', label: '文件', submenu: [
 *       { id: 'file.save', label: '保存', accelerator: 'CmdOrCtrl+S', click: () => save() }
 *     ]}
 *   ]
 * })
 *
 * // 任意位置按路径更新
 * menus.update('app', 'file.save', { enabled: false, label: '保存中…' })
 * ```
 */
export const menus = createMenuManager()
