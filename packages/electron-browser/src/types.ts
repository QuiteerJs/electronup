import type {
  BrowserWindow,
  BrowserWindowConstructorOptions,
  HandlerDetails,
  WindowOpenHandlerResponse,
} from 'electron';

/** 同名窗口已存在时的处理策略 */
export type WindowConflictStrategy = 'focus' | 'recreate' | 'error';

/**
 * `window.open` / `target="_blank"` 的处理方式
 *
 * - `'deny'`: 一律拒绝
 * - `'external'`: 拒绝在应用内打开, http(s) / mailto 链接交给系统默认程序
 * - 函数: 等价于 `webContents.setWindowOpenHandler`
 */
export type WindowOpenPolicy =
  | 'deny'
  | 'external'
  | ((details: HandlerDetails) => WindowOpenHandlerResponse);

/** 导航守卫 */
export interface NavigationGuardOptions {
  /**
   * 允许窗口内跳转到的 origin, 如 `https://example.com`、`file://`
   *
   * 当前页面与初始加载地址的 origin 总是被允许
   */
  allowedOrigins?: string[];
  /** 自定义判断, 传入后取代 `allowedOrigins` 的默认规则 */
  allowNavigation?: (url: string) => boolean;
  /**
   * `window.open` / `target="_blank"` 的处理方式
   * @default 'deny'
   */
  windowOpen?: WindowOpenPolicy;
}

/** 持久化的窗口状态 */
export interface WindowState {
  x?: number;
  y?: number;
  width: number;
  height: number;
  isMaximized: boolean;
  isFullScreen: boolean;
}

/** 窗口状态存储, 默认写入 `userData/window-state.json` */
export interface WindowStateStorage {
  get: (key: string) => WindowState | undefined;
  set: (key: string, state: WindowState) => void;
}

export interface PersistStateOptions {
  /**
   * 存储键
   * @default 窗口 name
   */
  key?: string;
  /** 自定义存储, 例如接入 electron-store */
  storage?: WindowStateStorage;
}

export interface WindowOptions<N extends string = string> extends Omit<
  BrowserWindowConstructorOptions,
  'parent'
> {
  /** 窗口名称, 全局唯一标识, 后续按名取窗 */
  name: N;
  /** 创建后立即加载的地址, 支持 http(s):// 与 file:// */
  url?: string;
  /** 创建后立即加载的本地 html 文件, 走 `loadFile`, 与 `url` 二选一 */
  file?: string;
  /**
   * 父窗口, 可直接传窗口名 (仅 manager.create 支持按名解析)
   */
  parent?: BrowserWindow | N;
  /** 创建后立即打开开发者工具 */
  openDevTools?: boolean;
  /**
   * 未显式设置 show: true 时, 是否在 ready-to-show 后自动显示
   * @default true
   */
  showOnReady?: boolean;
  /**
   * 同名窗口已存在时的处理策略
   * @default 'focus'
   */
  conflict?: WindowConflictStrategy;
  /**
   * 导航守卫, 默认只允许同源跳转并拒绝 window.open; 传 false 关闭
   * @default {}
   */
  navigation?: NavigationGuardOptions | false;
  /**
   * 记住窗口尺寸、位置、最大化与全屏状态, 下次创建时恢复
   * @default false
   */
  persistState?: boolean | PersistStateOptions;
  /**
   * `url` / `file` 加载失败时回调, 默认 console.error
   */
  onLoadError?: (error: Error, controller: WindowController<N>) => void;
}

/** 可直接读写的响应式窗口属性, 读写均同步到真实窗口 */
export interface WindowReactiveProps {
  width: number;
  height: number;
  x: number;
  y: number;
  title: string;
  /** 读: isVisible(), 写: show() / hide() */
  visible: boolean;
  /** 只写, 置为 true 时窗口居中 */
  centered: boolean;
}

/** 窗口控制句柄, 在 BrowserWindow 之上补充响应式属性与 name */
export type WindowController<N extends string = string> = Omit<
  BrowserWindow,
  keyof WindowReactiveProps
> &
  WindowReactiveProps & {
    /** 窗口名称 */
    readonly name: N;
    /** 原始 BrowserWindow 实例 */
    readonly target: BrowserWindow;
  };
