import { Menu, app } from 'electron';
import type {
  BaseWindow,
  MenuItemConstructorOptions,
  MenuItem as MenuItemType,
  Menu as MenuType,
} from 'electron';

import { findItem, normalizeTemplate } from './path';
import type {
  MenuController,
  MenuItemHandle,
  MenuItemPatch,
  MenuKind,
  MenuOptions,
  MenuTemplate,
  MenuTemplateInput,
} from './types';

/** 菜单内部状态, 通过 WeakMap 与控制句柄关联, 不进入公开类型 */
export interface MenuState<N extends string = string> {
  name: N;
  kind: MenuKind;
  /** 当前原生菜单实例, refresh() 后会替换为新实例 */
  menu: MenuType;
  template: MenuTemplateInput | undefined;
  window: BaseWindow | undefined;
  controller: MenuController<N> | undefined;
  /** 由仓库注入, destroy() 时回调以摘除注册 */
  onDestroy: ((name: N) => void) | undefined;
}

const states = new WeakMap<object, MenuState<any>>();

/** 取控制句柄关联的内部状态 */
export function getMenuState<N extends string>(controller: MenuController<N>): MenuState<N> {
  return states.get(controller) as MenuState<N>;
}

/** 构造菜单内部状态 */
export function createMenuState<N extends string>(
  name: N,
  init: Partial<MenuState<N>> & { menu: MenuType },
): MenuState<N> {
  return {
    name,
    kind: 'application',
    template: undefined,
    window: undefined,
    controller: undefined,
    onDestroy: undefined,
    ...init,
  };
}

/** 求值模板, 函数模板在此刻执行 */
function resolveTemplate(template: MenuTemplateInput | undefined): MenuTemplate | undefined {
  if (template === undefined) {
    return undefined;
  }
  return typeof template === 'function' ? template() : template;
}

/** 按模板构建原生菜单, 自动补全 id */
function buildMenu(template: MenuTemplate | undefined): MenuType {
  if (template === undefined) {
    return Menu.buildFromTemplate([]);
  }
  return Menu.buildFromTemplate(normalizeTemplate(template) as MenuItemConstructorOptions[]);
}

/**
 * 应用菜单到系统
 *
 * - application: `Menu.setApplicationMenu()`
 * - dock: `app.dock.setMenu()`, 仅 macOS 存在, 其他平台静默跳过
 * - context: 无需应用, 由 `popup()` 按需弹出
 */
function applyMenu(menu: MenuType, kind: MenuKind): void {
  if (kind === 'application') {
    Menu.setApplicationMenu(menu);
  } else if (kind === 'dock') {
    app.dock?.setMenu(menu);
  }
}

/**
 * 菜单项改动后是否需要重新应用才能生效
 *
 * macOS 上菜单项属性改动会同步到原生菜单, Windows / Linux 必须重新
 * `setApplicationMenu()` 才生效; dock 菜单仅 macOS 有, 且需重新 `setMenu()`
 */
function needsReapply(kind: MenuKind): boolean {
  if (process.platform === 'darwin') {
    return kind === 'dock';
  }
  return kind === 'application';
}

/**
 * 按配置构建原生菜单
 *
 * 自动补全模板项 id, 使每一项都能被点分路径定位
 */
export function createMenu<N extends string>(options: MenuOptions<N>): MenuType {
  return buildMenu(resolveTemplate(options.template));
}

/**
 * 把原生菜单包装成控制句柄
 *
 * - `item('file.save')` 按点分路径定位任意层级菜单项
 * - 句柄读写属性直接作用于原生 MenuItem, 写后自动按平台刷新
 * - `refresh()` 按模板重建, 模板为函数时重新求值
 */
export function toController<N extends string>(
  menu: MenuType,
  state: MenuState<N>,
): MenuController<N> {
  state.menu = menu;

  /** 重新应用菜单, 仅当平台需要时 */
  const reapply = (): void => {
    if (needsReapply(state.kind)) {
      applyMenu(state.menu, state.kind);
    }
  };

  /** 按模板重建菜单, 模板为函数时重新求值 */
  const rebuild = (): void => {
    const template = resolveTemplate(state.template);
    if (template === undefined) {
      return;
    }
    state.menu = buildMenu(template);
    applyMenu(state.menu, state.kind);
  };

  /** 把原生 MenuItem 包装成响应式句柄 */
  const toHandle = (menuItem: MenuItemType, path: string): MenuItemHandle => {
    return new Proxy(menuItem, {
      get(target, key) {
        switch (key) {
          case 'target':
          case 'raw':
            return target;
          case 'path':
            return path;
          case 'update':
            return (patch: MenuItemPatch): void => {
              const record = target as unknown as Record<string, unknown>;
              for (const [prop, value] of Object.entries(patch)) {
                record[prop] = value;
              }
              reapply();
            };
        }

        const value = Reflect.get(target, key);
        return typeof value === 'function' ? value.bind(target) : value;
      },
      set(target, key, value) {
        if (key === 'target' || key === 'raw' || key === 'path' || key === 'update') {
          return false;
        }
        Reflect.set(target, key, value);
        reapply();
        return true;
      },
    }) as MenuItemHandle;
  };

  const controller: MenuController<N> = {
    get name() {
      return state.name;
    },
    get kind() {
      return state.kind;
    },
    get target() {
      return state.menu;
    },
    get template() {
      return state.template;
    },
    set template(next: MenuTemplateInput | undefined) {
      state.template = next;
    },

    item: (path) => {
      const found = findItem(state.menu, path);
      return found ? toHandle(found, path) : undefined;
    },
    update: (path, patch) => {
      const found = findItem(state.menu, path);
      if (!found) {
        return false;
      }
      toHandle(found, path).update(patch);
      return true;
    },
    items: () => state.menu.items.map((item, index) => toHandle(item, item.id || `${index}`)),
    get: (id) => {
      const found = state.menu.getMenuItemById(id);
      return found ? toHandle(found, id) : undefined;
    },
    append: (item) => {
      state.menu.append(item);
      reapply();
    },
    insert: (pos, item) => {
      state.menu.insert(pos, item);
      reapply();
    },
    refresh: rebuild,
    apply: () => applyMenu(state.menu, state.kind),
    popup: (options) => {
      state.menu.popup(options ?? (state.window ? { window: state.window } : undefined));
    },
    closePopup: (window) => state.menu.closePopup(window),
    on: (event, listener) =>
      event === 'menu-will-show'
        ? state.menu.on('menu-will-show', listener)
        : state.menu.on('menu-will-close', listener),
    once: (event, listener) =>
      event === 'menu-will-show'
        ? state.menu.once('menu-will-show', listener)
        : state.menu.once('menu-will-close', listener),
    off: (event, listener) =>
      event === 'menu-will-show'
        ? state.menu.off('menu-will-show', listener)
        : state.menu.off('menu-will-close', listener),
    destroy: () => {
      state.onDestroy?.(state.name);
    },
  };

  states.set(controller, state);
  state.controller = controller;
  return controller;
}
