import type { BrowserWindow } from 'electron';

import type { ShortcutError } from './error';

/**
 * 快捷键生效范围
 *
 * - `global`: 系统级, 应用在后台也响应
 * - `focused`: 仅当应用有窗口处于焦点时注册, 失焦即注销, 不抢占其他应用的按键
 */
export type ShortcutScope = 'global' | 'focused';

/** 绑定窗口: 实例或惰性取值函数 (如 `() => windows.get('main')`) */
export type ShortcutWindow = BrowserWindow | (() => BrowserWindow | null | undefined);

/** 同名快捷键已存在时的处理策略 */
export type ShortcutConflictStrategy = 'reuse' | 'recreate' | 'error';

/** 触发回调上下文 */
export interface ShortcutContext<N extends string = string> {
  /** 快捷键名称 */
  readonly name: N;
  /** 本次触发的按键组合 */
  readonly accelerator: string;
  /** 快捷键控制句柄自身 */
  readonly shortcut: ShortcutController<N>;
}

export type ShortcutHandler<N extends string = string> = (ctx: ShortcutContext<N>) => void;

/** 快捷键注册配置 */
export interface ShortcutOptions<N extends string = string> {
  /** 快捷键名称, 全局唯一标识, 后续按名取用 */
  name: N;
  /**
   * 按键组合, 写法同 Electron Accelerator, 如 `CmdOrCtrl+Shift+K`
   *
   * 传数组时任一组合都会触发, 全部注册成功才算成功
   */
  accelerator: string | string[];
  /** 触发回调 */
  handler: ShortcutHandler<N>;
  /**
   * 生效范围
   * @default 'global', 指定 window 时为 'focused'
   */
  scope?: ShortcutScope;
  /**
   * 仅当该窗口处于焦点时生效 (隐含 `scope: 'focused'`)
   *
   * 传实例时窗口关闭会自动注销该快捷键
   */
  window?: ShortcutWindow;
  /**
   * 初始是否启用
   * @default true
   */
  enabled?: boolean;
  /**
   * 同名快捷键已存在时的处理策略
   *
   * 默认 `recreate`: 再次注册同名快捷键通常意味着更新绑定
   * @default 'recreate'
   */
  conflict?: ShortcutConflictStrategy;
  /**
   * 注册失败 (按键被占用 / 写法非法) 时的回调
   *
   * 不传时: 同步调用 (register / 改 accelerator / enable) 直接抛错,
   * 由焦点变化等事件触发的注册失败输出到 console.error
   */
  onError?: (error: ShortcutError) => void;
}

/**
 * 快捷键控制句柄
 *
 * `accelerator` / `enabled` / `handler` 可直接读写, 写入后立即同步到系统注册
 */
export interface ShortcutController<N extends string = string> {
  /** 快捷键名称 */
  readonly name: N;
  /** 生效范围 */
  readonly scope: ShortcutScope;
  /** 读: 当前按键组合; 写: 换绑, 失败时回滚到旧组合 */
  get accelerator(): string[];
  set accelerator(value: string | string[]);
  /** 读: 是否启用; 写: 启用 / 停用 */
  enabled: boolean;
  /** 触发回调, 可随时替换 */
  handler: ShortcutHandler<N>;
  /** 当前是否真正注册到了系统 (受 enabled / scope / 焦点 / 暂停状态影响) */
  readonly registered: boolean;
  /** 是否已注销 */
  readonly disposed: boolean;
  enable: () => void;
  disable: () => void;
  /** 注销并从管理器摘除 */
  unregister: () => void;
}
