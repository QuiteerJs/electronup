import type {
  DisplayBalloonOptions,
  Menu,
  MenuItemConstructorOptions,
  NativeImage,
  Size,
  TitleOptions,
  Tray,
} from 'electron';

/** 托盘图标来源: 图片路径 / data URL / NativeImage */
export type TrayIconSource = string | NativeImage;

/** 多状态图标表, key 为状态名 */
export type TrayIconMap<S extends string = string> = Record<S, TrayIconSource>;

/**
 * 托盘图标配置
 *
 * - 单个来源: 全程用一个图标
 * - 状态表: 配合 `state` 响应式切换, 如 `{ idle, syncing, error }`
 */
export type TrayIconOption<S extends string = string> = TrayIconSource | TrayIconMap<S>;

/** 图标处理选项 */
export interface TrayIconOptions {
  /** 统一缩放尺寸, 如 macOS 托盘推荐 `{ width: 16, height: 16 }` */
  size?: Size;
  /**
   * macOS 模板图模式: 图标自动适配系统明暗色
   * @platform darwin
   */
  template?: boolean;
}

/** 菜单模板, 传函数时每次 refreshMenu 会重新求值 */
export type TrayMenuTemplate<N extends string = string, S extends string = string> =
  | MenuItemConstructorOptions[]
  | ((ctx: TrayEventContext<N, S>) => MenuItemConstructorOptions[]);

/** 事件回调上下文 */
export interface TrayEventContext<N extends string = string, S extends string = string> {
  /** 托盘名称 */
  readonly name: N;
  /** 当前图标状态 */
  readonly state: S | undefined;
  /** 托盘控制句柄自身 */
  readonly tray: TrayController<N, S>;
}

/** 点击类事件回调, 带事件坐标 (click) */
export type TrayClickHandler<N extends string = string, S extends string = string> = (
  ctx: TrayEventContext<N, S>,
  event: Electron.KeyboardEvent,
  bounds: Electron.Rectangle,
  position: Electron.Point,
) => void;

/**
 * 点击类事件回调, 仅带托盘区域信息 (double-click / right-click / middle-click)
 *
 * Electron 在这几个事件上不提供事件坐标, 需要定位请用 bounds
 */
export type TrayBoundsClickHandler<N extends string = string, S extends string = string> = (
  ctx: TrayEventContext<N, S>,
  event: Electron.KeyboardEvent,
  bounds: Electron.Rectangle,
) => void;

/** 无参事件回调 (balloon-* / drop 等) */
export type TraySimpleHandler<N extends string = string, S extends string = string> = (
  ctx: TrayEventContext<N, S>,
) => void;

/** 文件拖放事件回调 */
export type TrayDropFilesHandler<N extends string = string, S extends string = string> = (
  ctx: TrayEventContext<N, S>,
  event: Electron.Event,
  files: string[],
) => void;

/** 同名托盘已存在时的处理策略 */
export type TrayConflictStrategy = 'reuse' | 'recreate' | 'error';

/** 托盘创建配置 */
export interface TrayOptions<N extends string = string, S extends string = string> {
  /** 托盘名称, 全局唯一标识, 后续按名取用 */
  name: N;
  /** 托盘图标, 单图标或状态表 */
  icon: TrayIconOption<S>;
  /** 初始状态, 使用状态表时默认取第一个 key */
  initialState?: S;
  /** 悬停提示文本 */
  tooltip?: string;
  /**
   * 标题栏文本 (显示在图标旁)
   * @platform darwin
   */
  title?: string;
  /** setTitle 的附加选项 */
  titleOptions?: TitleOptions;
  /**
   * 按下态图标
   * @platform darwin
   */
  pressedIcon?: TrayIconSource;
  /** 图标统一缩放尺寸 */
  iconSize?: Size;
  /** macOS 模板图模式, 为 true 时建议提供纯黑透明底图标 */
  templateIcon?: boolean;
  /** 右键菜单模板 */
  contextMenu?: TrayMenuTemplate<N, S>;
  /** 忽略双击事件中的首次点击, 避免单击与双击回调重复触发 */
  ignoreDoubleClick?: boolean;
  /**
   * 点击左键时手动弹出菜单
   *
   * 部分 Linux 桌面环境不会自动弹出托盘菜单, 可开启此项兜底
   * @default false
   */
  popupOnClick?: boolean;
  /**
   * 同名托盘已存在时的处理策略
   * @default 'reuse'
   */
  conflict?: TrayConflictStrategy;
  /**
   * Windows 托盘唯一标识, 用于保持托盘图标位置
   * @platform win32
   */
  guid?: string;
  /** 左键单击 (Linux 下为任意激活) */
  onClick?: TrayClickHandler<N, S>;
  onDoubleClick?: TrayBoundsClickHandler<N, S>;
  onRightClick?: TrayBoundsClickHandler<N, S>;
  onMiddleClick?: TrayBoundsClickHandler<N, S>;
  onBalloonClick?: TraySimpleHandler<N, S>;
  onBalloonShow?: TraySimpleHandler<N, S>;
  onBalloonClosed?: TraySimpleHandler<N, S>;
  onDropFiles?: TrayDropFilesHandler<N, S>;
}

/** 可直接读写的响应式托盘属性 */
export interface TrayReactiveProps<N extends string = string, S extends string = string> {
  /** 读: 当前状态名; 写: 切换状态并同步换图标 */
  state: S | undefined;
  /** 读: 当前图标来源; 写: 直接换图标 */
  icon: TrayIconSource | undefined;
  /** 读: 本地记录的提示文本; 写: setToolTip() */
  tooltip: string | undefined;
  /** 读: getTitle(); 写: setTitle() */
  title: string;
  /** 读: 当前菜单实例; 写: 传入模板 / Menu / null 更新右键菜单 */
  get menu(): Menu | undefined;
  set menu(value: TrayMenuTemplate<N, S> | Menu | null);
}

/**
 * 托盘控制句柄
 *
 * 在原生 Tray 之上补充响应式属性与 name, 其余方法透传
 */
export type TrayController<N extends string = string, S extends string = string> = Omit<
  Tray,
  keyof TrayReactiveProps<N, S> | 'destroy'
> &
  TrayReactiveProps<N, S> & {
    /** 托盘名称 */
    readonly name: N;
    /** 原始 Tray 实例 */
    readonly target: Tray;
    /** 按模板重新构建菜单, 模板为函数时重新求值 */
    refreshMenu: () => Menu | undefined;
    /** 弹出气泡通知, 仅 Windows 生效, 返回是否真的弹出 */
    balloon: (options: DisplayBalloonOptions) => boolean;
    /** 销毁托盘并从仓库摘除 */
    destroy: () => void;
  };
