import type { BrowserWindow, BrowserWindowConstructorOptions } from 'electron';

/** 同名窗口已存在时的处理策略 */
export type WindowConflictStrategy = 'focus' | 'recreate' | 'error';

export interface WindowOptions<N extends string = string> extends BrowserWindowConstructorOptions {
  /** 窗口名称, 全局唯一标识, 后续按名取窗 */
  name: N;
  /** 创建后立即加载的地址, 支持 http(s):// 与 file:// */
  url?: string;
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
