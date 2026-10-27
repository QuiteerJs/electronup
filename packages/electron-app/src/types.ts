import type { BrowserWindow } from 'electron';

/**
 * 按名取窗口的对象
 *
 * `@quiteer/electron-browser` 导出的 `windows` / `createWindowManager()` 天然满足,
 * 本包不依赖它, 也可以传任意自定义实现
 */
export interface WindowLookup {
  get: (name: string) => BrowserWindow | undefined;
}

/** 主窗口: 窗口名 (需配合 windows) 或取值函数 */
export type MainWindowOption = string | (() => BrowserWindow | null | undefined);

/** 退出前执行的清理任务, 可返回 Promise */
export type QuitTask = () => unknown;

/** deep link / 文件打开的来源 */
export type OpenSource = 'launch' | 'second-instance' | 'open-url' | 'open-file';

export interface OpenContext {
  /** 本次打开从哪里来 */
  readonly source: OpenSource;
}

/** 第二个实例启动时的上下文 */
export interface SecondInstanceContext {
  /** 第二个实例的命令行参数 */
  readonly argv: string[];
  /** 第二个实例的工作目录 */
  readonly workingDirectory: string;
  /** 第二个实例通过 requestSingleInstanceLock 传来的数据 */
  readonly additionalData: unknown;
}

/** 生命周期中出错的阶段 */
export type AppErrorPhase = 'ready' | 'create-window' | 'open' | 'quit';

export interface SingleInstanceOptions {
  /**
   * 第二个实例启动时是否自动聚焦主窗口 (主窗口不存在时调用 createMainWindow)
   * @default true
   */
  focus?: boolean;
  /** 传给 requestSingleInstanceLock, 在主实例的 second-instance 里可读到 */
  additionalData?: Record<string, unknown>;
}

export interface AppOptions {
  /**
   * 单实例锁, 拿不到锁的进程会直接退出
   * @default true
   */
  singleInstance?: boolean | SingleInstanceOptions;
  /** 按名取窗口, 通常传 `@quiteer/electron-browser` 的 `windows` */
  windows?: WindowLookup;
  /**
   * 主窗口, 用于第二实例聚焦与 focusMainWindow
   *
   * 传字符串时从 windows 按名取; 不传时取第一个存活窗口
   */
  mainWindow?: MainWindowOption;
  /**
   * 创建主窗口
   *
   * ready 时、macOS 点击 Dock 且没有窗口时、第二实例启动而主窗口不存在时调用
   */
  createMainWindow?: () => unknown;
  /** ready 后、创建主窗口之前调用, 适合注册菜单 / 托盘 / ipc */
  onReady?: () => unknown;
  /**
   * 注册为系统默认协议处理程序的 scheme, 如 `myapp` 对应 `myapp://...`
   *
   * 开发模式 (`electron .`) 下会自动带上入口脚本路径
   */
  protocols?: string | string[];
  /**
   * 收到 deep link
   *
   * 统一了 macOS 的 open-url 事件与 Windows / Linux 的命令行参数,
   * ready 之前收到的链接会缓存到 ready 并创建主窗口之后再分发
   */
  onOpenUrl?: (url: string, ctx: OpenContext) => void;
  /**
   * 收到要打开的文件
   * @platform darwin
   */
  onOpenFile?: (path: string, ctx: OpenContext) => void;
  /** 第二个实例启动时 (已按 singleInstance.focus 聚焦主窗口之后) 调用 */
  onSecondInstance?: (ctx: SecondInstanceContext) => void;
  /**
   * 所有窗口关闭后是否退出
   * @default process.platform !== 'darwin'
   */
  quitOnAllWindowsClosed?: boolean;
  /** 退出前依次执行的清理任务, 如 `trays.destroyAll`, `windows.closeAll` */
  beforeQuit?: QuitTask | QuitTask[];
  /**
   * 清理任务总超时 (毫秒), 超时后不再等待, 直接退出
   * @default 5000
   */
  quitTimeout?: number;
  /** 生命周期回调出错时调用, 不传则输出到 console.error */
  onError?: (error: unknown, phase: AppErrorPhase) => void;
}

export interface AppController {
  /** 是否拿到了单实例锁; 为 false 时进程正在退出, 不要再做初始化 */
  readonly isPrimary: boolean;
  /** 是否已进入退出流程, 常用于窗口 close 事件里区分「隐藏到托盘」还是「真正关闭」 */
  readonly isQuitting: boolean;
  /** 取主窗口 */
  getMainWindow: () => BrowserWindow | undefined;
  /** 还原并聚焦主窗口, 不存在时调用 createMainWindow; 都没有时返回 false */
  focusMainWindow: () => boolean;
  /** 追加退出前清理任务, 返回取消函数 */
  onBeforeQuit: (task: QuitTask) => () => void;
  /** 退出应用 (会先执行清理任务) */
  quit: () => void;
  /** 移除本包注册的所有 app 监听, 用于热重载或测试 */
  dispose: () => void;
}
