import type { BaseWindow, Menu as MenuType, PopupOptions } from 'electron';

import { createMenu, createMenuState, toController } from './menu';
import { MenuStore } from './store';
import type {
  MenuConflictStrategy,
  MenuController,
  MenuItemHandle,
  MenuItemPatch,
  MenuKind,
  MenuOptions,
} from './types';

export interface MenuManager<N extends string = string> {
  /** 菜单仓库 */
  store: MenuStore<N>;
  /** 已注册菜单数量 */
  readonly size: number;
  /** 创建菜单并注册 */
  create: (options: MenuOptions<N>) => MenuController<N>;
  /** 把外部创建的菜单纳入管理 */
  register: (name: N, menu: MenuType, kind?: MenuKind) => MenuController<N>;
  /** 按名取原生菜单实例 */
  get: (name: N) => MenuType | undefined;
  /** 按名取控制句柄 */
  getController: (name: N) => MenuController<N> | undefined;
  /** 按名取原生菜单实例, 不存在时抛错 */
  getOrThrow: (name: N) => MenuType;
  /** 按点分路径取菜单项句柄 */
  item: (name: N, path: string) => MenuItemHandle | undefined;
  /** 按点分路径更新菜单项 */
  update: (name: N, path: string, patch: MenuItemPatch) => boolean;
  /** 按模板重建菜单 */
  refresh: (name: N) => boolean;
  /** 重新应用菜单 */
  apply: (name: N) => boolean;
  /** 弹出上下文菜单 */
  popup: (name: N, options?: PopupOptions) => boolean;
  /** 关闭已弹出的上下文菜单 */
  closePopup: (name: N, window?: BaseWindow) => boolean;
  has: (name: N) => boolean;
  /** 摘除注册 */
  destroy: (name: N) => boolean;
  /** 摘除所有注册 */
  destroyAll: () => void;
  /** 所有原生菜单实例 */
  list: () => MenuType[];
  /** 所有菜单名称 */
  names: () => N[];
}

/**
 * 创建菜单管理器
 *
 * @example
 * ```ts
 * export const menus = createMenuManager<'app' | 'editor'>()
 *
 * menus.create({
 *   name: 'app',
 *   template: [
 *     { id: 'file', label: '文件', submenu: [
 *       { id: 'file.save', label: '保存', click: () => save() }
 *     ]}
 *   ]
 * })
 * ```
 */
export function createMenuManager<N extends string = string>(): MenuManager<N> {
  const store = new MenuStore<N>();

  const withController = (name: N, fn: (controller: MenuController<N>) => void): boolean => {
    const controller = store.getController(name);
    if (!controller) {
      return false;
    }
    fn(controller);
    return true;
  };

  const create = (options: MenuOptions<N>): MenuController<N> => {
    const strategy: MenuConflictStrategy = options.conflict ?? 'reuse';
    const existing = store.getController(options.name);

    if (existing) {
      if (strategy === 'error') {
        throw new Error(`[electron-menu] 菜单 "${options.name}" 已存在`);
      }
      if (strategy === 'reuse') {
        return existing;
      }
      store.remove(options.name);
    }

    const kind: MenuKind = options.kind ?? 'application';
    const menu = createMenu(options);
    const controller = toController(
      menu,
      createMenuState<N>(options.name, {
        menu,
        kind,
        template: options.template,
        window: options.window,
      }),
    );

    if (options.apply !== false && kind !== 'context') {
      controller.apply();
    }

    return store.register(options.name, controller);
  };

  const getOrThrow = (name: N): MenuType => {
    const menu = store.get(name);
    if (!menu) {
      throw new Error(`[electron-menu] 菜单 "${name}" 不存在`);
    }
    return menu;
  };

  const destroy = (name: N): boolean => {
    const controller = store.getController(name);
    if (!controller) {
      return false;
    }
    controller.destroy();
    return true;
  };

  return {
    store,
    get size() {
      return store.size;
    },
    create,
    register: (name, menu, kind = 'application') =>
      store.register(name, toController(menu, createMenuState<N>(name, { menu, kind }))),
    get: (name) => store.get(name),
    getController: (name) => store.getController(name),
    getOrThrow,
    item: (name, path) => store.getController(name)?.item(path),
    update: (name, path, patch) => store.getController(name)?.update(path, patch) ?? false,
    refresh: (name) => withController(name, (controller) => controller.refresh()),
    apply: (name) => withController(name, (controller) => controller.apply()),
    popup: (name, options) => withController(name, (controller) => controller.popup(options)),
    closePopup: (name, window) =>
      withController(name, (controller) => controller.closePopup(window)),
    has: (name) => store.has(name),
    destroy,
    destroyAll: () => store.destroyAll(),
    list: () => store.list(),
    names: () => store.names(),
  };
}
