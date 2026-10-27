import type {
  BaseWindow,
  MenuItemConstructorOptions,
  MenuItem as MenuItemType,
  Menu as MenuType,
  PopupOptions,
} from 'electron';

/**
 * 菜单用途
 *
 * - `application` 应用菜单, 创建后自动 `Menu.setApplicationMenu()`
 * - `context` 上下文菜单, 需手动 `popup()` 弹出
 * - `dock` macOS 程序坞菜单, 其他平台静默忽略
 */
export type MenuKind = 'application' | 'context' | 'dock';

/** 同名菜单冲突策略 */
export type MenuConflictStrategy =
  /** 复用已存在的菜单 (默认) */
  | 'reuse'
  /** 丢弃旧菜单, 按当前配置重建 */
  | 'recreate'
  /** 直接抛错 */
  | 'error';

/**
 * 菜单模板项
 *
 * 完全兼容原生 `MenuItemConstructorOptions`, 仅额外允许 `id` 作为定位标识。
 * 未指定 `id` 时按层级位置自动生成 (如 `file.1`), 保证每一项都能被定位。
 */
export type MenuTemplateItem = Omit<MenuItemConstructorOptions, 'submenu'> & {
  /** 定位标识, 支持点分路径; 不填按层级位置自动生成 */
  id?: string;
  submenu?: MenuTemplate;
};

/** 菜单模板 */
export type MenuTemplate = MenuTemplateItem[];

/** 菜单模板输入, 传函数时 `refresh()` 会重新求值 */
export type MenuTemplateInput = MenuTemplate | (() => MenuTemplate);

/** 可批量更新的菜单项属性 */
export type MenuItemPatch = Pick<
  MenuItemConstructorOptions,
  | 'label'
  | 'sublabel'
  | 'enabled'
  | 'visible'
  | 'checked'
  | 'accelerator'
  | 'icon'
  | 'toolTip'
  | 'click'
>;

/**
 * 响应式菜单项句柄
 *
 * 读写属性直接作用于原生 MenuItem, 写后自动按平台刷新菜单
 */
export type MenuItemHandle = MenuItemType & {
  /** 原生菜单项实例 */
  readonly target: MenuItemType;
  /** 定位路径, 如 'file.save' */
  readonly path: string;
  /** 批量更新属性 */
  update: (patch: MenuItemPatch) => void;
};

/** 菜单创建配置 */
export interface MenuOptions<N extends string = string> {
  /** 菜单名, 用于后续取用 */
  name: N;
  /** 菜单模板, 传函数时 `refresh()` 重新求值 */
  template?: MenuTemplateInput;
  /** 菜单用途, 默认 'application' */
  kind?: MenuKind;
  /** application / dock 是否在创建后立即应用, 默认 true */
  apply?: boolean;
  /** 同名菜单冲突策略, 默认 'reuse' */
  conflict?: MenuConflictStrategy;
  /** context 菜单 `popup()` 时的默认目标窗口 */
  window?: BaseWindow;
}

/** 菜单事件类型 */
export type MenuEvent = 'menu-will-show' | 'menu-will-close';

/** 菜单事件监听 */
/** 菜单事件对象 */
export interface MenuEventObject {
  preventDefault: () => void;
  readonly defaultPrevented: boolean;
}

/** 菜单事件监听 */
export type MenuEventListener = (event: MenuEventObject) => void;

/**
 * 菜单控制句柄
 *
 * 负责按点分路径定位菜单项、响应式更新、按平台刷新与弹出
 */
export interface MenuController<N extends string = string> {
  /** 菜单名 */
  readonly name: N;
  /** 菜单用途 */
  readonly kind: MenuKind;
  /** 原生菜单实例 */
  readonly target: MenuType;
  /** 当前模板, 未传入时为 undefined */
  template: MenuTemplateInput | undefined;
  /** 按点分路径取菜单项句柄, 如 'file.save' */
  item: (path: string) => MenuItemHandle | undefined;
  /** 按点分路径批量更新菜单项, 项不存在返回 false */
  update: (path: string, patch: MenuItemPatch) => boolean;
  /** 顶级菜单项句柄 */
  items: () => MenuItemHandle[];
  /** 按 id 查找菜单项 (等价于原生 getMenuItemById, 支持任意层级) */
  get: (id: string) => MenuItemHandle | undefined;
  /** 追加菜单项 */
  append: (item: MenuItemType) => void;
  /** 在指定位置插入菜单项 */
  insert: (pos: number, item: MenuItemType) => void;
  /** 按模板重建菜单, 模板为函数时重新求值 */
  refresh: () => void;
  /** 重新应用菜单: application -> setApplicationMenu, dock -> app.dock.setMenu */
  apply: () => void;
  /** 弹出上下文菜单 */
  popup: (options?: PopupOptions) => void;
  /** 关闭已弹出的上下文菜单 */
  closePopup: (window?: BaseWindow) => void;
  /** 监听菜单事件 */
  on: (event: MenuEvent, listener: MenuEventListener) => MenuType;
  /** 监听一次菜单事件 */
  once: (event: MenuEvent, listener: MenuEventListener) => MenuType;
  /** 移除菜单事件监听 */
  off: (event: MenuEvent, listener: MenuEventListener) => MenuType;
  /** 摘除注册 (菜单本身无销毁概念, 仅从仓库移除) */
  destroy: () => void;
}
