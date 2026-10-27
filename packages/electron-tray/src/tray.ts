import { Menu, Tray } from 'electron';
import type {
  DisplayBalloonOptions,
  Menu as MenuType,
  TitleOptions,
  Tray as TrayType,
} from 'electron';

import { isIconMap, resolveIcon } from './icon';
import type {
  TrayController,
  TrayEventContext,
  TrayIconMap,
  TrayIconOptions,
  TrayIconSource,
  TrayMenuTemplate,
  TrayOptions,
} from './types';

/** 托盘内部状态, 通过 WeakMap 与控制器关联, 不进入公开类型 */
export interface TrayState<N extends string = string, S extends string = string> {
  name: N;
  icons: TrayIconMap<S> | undefined;
  state: S | undefined;
  icon: TrayIconSource | undefined;
  tooltip: string | undefined;
  menuTemplate: TrayMenuTemplate<N, S> | undefined;
  menu: MenuType | undefined;
  iconOptions: TrayIconOptions;
  titleOptions: TitleOptions | undefined;
  context: TrayEventContext<N, S> | undefined;
  controller: TrayController<N, S> | undefined;
  /** 由仓库注入, destroy() 时回调以摘除注册 */
  onDestroy: ((name: N) => void) | undefined;
}

const states = new WeakMap<object, TrayState<any, any>>();

/** 取控制器关联的内部状态 */
export function getTrayState<N extends string, S extends string>(
  controller: TrayController<N, S>,
): TrayState<N, S> {
  return states.get(controller) as TrayState<N, S>;
}

/** 构造托盘内部状态 */
export function createTrayState<N extends string, S extends string>(
  name: N,
  init: Partial<TrayState<N, S>> = {},
): TrayState<N, S> {
  return {
    name,
    icons: undefined,
    state: undefined,
    icon: undefined,
    tooltip: undefined,
    menuTemplate: undefined,
    menu: undefined,
    iconOptions: {},
    titleOptions: undefined,
    context: undefined,
    controller: undefined,
    onDestroy: undefined,
    ...init,
  };
}

/**
 * 把原生 Tray 包装成带响应式属性的控制句柄
 *
 * - 读 `state` / `icon` / `tooltip` 取自本地记录, 读 `title` 实时取自托盘
 * - 写 `state` 切换图标, 写 `icon` / `tooltip` / `title` / `menu` 直接作用到托盘
 * - 其余属性与方法透传 Tray, 方法自动绑定 this
 * - `destroy()` 覆写为「销毁 + 通知仓库摘除」
 */
export function toController<N extends string, S extends string>(
  tray: TrayType,
  state: TrayState<N, S>,
): TrayController<N, S> {
  const applyIcon = (source: TrayIconSource | undefined): void => {
    if (source === undefined) {
      return;
    }
    state.icon = source;
    if (!tray.isDestroyed()) {
      tray.setImage(resolveIcon(source, state.iconOptions));
    }
  };

  const applyState = (next: S | undefined): void => {
    if (next === undefined) {
      return;
    }
    const source = state.icons?.[next];
    if (source === undefined) {
      throw new Error(`[electron-tray] 托盘 "${state.name}" 未定义状态 "${next}" 的图标`);
    }
    applyIcon(source);
    state.state = next;
  };

  const buildMenu = (): MenuType | undefined => {
    const { menuTemplate } = state;
    if (menuTemplate === undefined) {
      return state.menu;
    }

    const items = typeof menuTemplate === 'function' ? menuTemplate(state.context!) : menuTemplate;
    const menu = Menu.buildFromTemplate(items);
    state.menu = menu;
    if (!tray.isDestroyed()) {
      tray.setContextMenu(menu);
    }
    return menu;
  };

  const applyMenu = (next: TrayMenuTemplate<N, S> | MenuType | null): void => {
    if (next === null) {
      state.menuTemplate = undefined;
      state.menu = undefined;
      if (!tray.isDestroyed()) {
        tray.setContextMenu(null);
      }
      return;
    }

    if (next instanceof Menu) {
      state.menuTemplate = undefined;
      state.menu = next;
      if (!tray.isDestroyed()) {
        tray.setContextMenu(next);
      }
      return;
    }

    state.menuTemplate = next;
    buildMenu();
  };

  const controller = new Proxy(tray, {
    get(target, key) {
      switch (key) {
        case 'name':
          return state.name;
        case 'target':
        case 'raw':
          return target;
        case 'state':
          return state.state;
        case 'icon':
          return state.icon;
        case 'tooltip':
          return state.tooltip;
        case 'title':
          return target.getTitle();
        case 'menu':
          return state.menu;
        case 'refreshMenu':
          return buildMenu;
        case 'balloon':
          return (options: DisplayBalloonOptions): boolean => {
            if (process.platform !== 'win32' || target.isDestroyed()) {
              return false;
            }
            target.displayBalloon(options);
            return true;
          };
        case 'destroy':
          return (): void => {
            if (!target.isDestroyed()) {
              target.destroy();
            }
            state.onDestroy?.(state.name);
          };
      }

      const value = Reflect.get(target, key, target);
      return typeof value === 'function' ? value.bind(target) : value;
    },

    set(target, key, value) {
      switch (key) {
        case 'name':
        case 'target':
        case 'raw':
          return false;
        case 'state':
          applyState(value);
          return true;
        case 'icon':
          applyIcon(value);
          return true;
        case 'tooltip':
          state.tooltip = value;
          target.setToolTip(value);
          return true;
        case 'title':
          target.setTitle(value, state.titleOptions);
          return true;
        case 'menu':
          applyMenu(value);
          return true;
      }

      Reflect.set(target, key, value, target);
      return true;
    },

    has(target, key) {
      return key === 'name' || key === 'target' || Reflect.has(target, key);
    },
  }) as unknown as TrayController<N, S>;

  state.controller = controller;
  state.context = {
    name: state.name,
    get state() {
      return state.state;
    },
    get tray() {
      return controller;
    },
  };
  states.set(controller, state);

  return controller;
}

/** 创建托盘并返回控制句柄 (不注册到仓库) */
export function createTray<N extends string, S extends string>(
  options: TrayOptions<N, S>,
): TrayController<N, S> {
  const {
    name,
    icon,
    initialState,
    tooltip,
    title,
    titleOptions,
    pressedIcon,
    iconSize,
    templateIcon,
    contextMenu,
    ignoreDoubleClick,
    popupOnClick,
    guid,
    onClick,
    onDoubleClick,
    onRightClick,
    onMiddleClick,
    onBalloonClick,
    onBalloonShow,
    onBalloonClosed,
    onDropFiles,
  } = options;

  const iconOptions: TrayIconOptions = { size: iconSize, template: templateIcon };
  const icons = isIconMap<S>(icon) ? icon : undefined;
  const stateName = icons ? (initialState ?? (Object.keys(icons)[0] as S)) : undefined;
  const firstIcon = icons ? icons[stateName as S] : (icon as TrayIconSource);

  if (firstIcon === undefined) {
    throw new Error(`[electron-tray] 托盘 "${name}" 缺少可用图标`);
  }

  const image = resolveIcon(firstIcon, iconOptions);
  const tray: TrayType = guid === undefined ? new Tray(image) : new Tray(image, guid);

  const state = createTrayState<N, S>(name, {
    icons,
    state: stateName,
    icon: firstIcon,
    iconOptions,
    titleOptions,
    menuTemplate: contextMenu,
  });

  const controller = toController<N, S>(tray, state);

  if (onClick) {
    tray.on('click', (event, bounds, position) => onClick(state.context!, event, bounds, position));
  }
  if (onDoubleClick) {
    tray.on('double-click', (event, bounds) => onDoubleClick(state.context!, event, bounds));
  }
  if (onRightClick) {
    tray.on('right-click', (event, bounds) => onRightClick(state.context!, event, bounds));
  }
  if (onMiddleClick) {
    tray.on('middle-click', (event, bounds) => onMiddleClick(state.context!, event, bounds));
  }
  if (onBalloonClick) {
    tray.on('balloon-click', () => onBalloonClick(state.context!));
  }
  if (onBalloonShow) {
    tray.on('balloon-show', () => onBalloonShow(state.context!));
  }
  if (onBalloonClosed) {
    tray.on('balloon-closed', () => onBalloonClosed(state.context!));
  }
  if (onDropFiles) {
    tray.on('drop-files', (event, files) => onDropFiles(state.context!, event, files));
  }

  if (popupOnClick) {
    tray.on('click', () => {
      const menu = controller.refreshMenu();
      if (menu && !tray.isDestroyed()) {
        tray.popUpContextMenu(menu);
      }
    });
  }

  if (ignoreDoubleClick) {
    tray.setIgnoreDoubleClickEvents(true);
  }
  if (pressedIcon !== undefined) {
    tray.setPressedImage(resolveIcon(pressedIcon, iconOptions));
  }
  if (tooltip !== undefined) {
    controller.tooltip = tooltip;
  }
  if (title !== undefined) {
    controller.title = title;
  }
  if (contextMenu !== undefined) {
    controller.refreshMenu();
  }

  return controller;
}
