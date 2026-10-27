/**
 * 注册失败原因
 *
 * - `occupied`: 已被其他应用或系统占用 (globalShortcut.register 返回 false)
 * - `duplicate`: 已被本应用另一个快捷键占用
 * - `invalid`: 按键写法非法
 */
export type ShortcutErrorReason = 'occupied' | 'duplicate' | 'invalid';

/** 快捷键注册失败 */
export class ShortcutError extends Error {
  override readonly name = 'ShortcutError';
  /** 快捷键名称 */
  readonly shortcut: string;
  /** 注册失败的按键组合 */
  readonly accelerator: string;
  readonly reason: ShortcutErrorReason;
  /** reason 为 duplicate 时, 占用该组合的本应用快捷键名称 */
  readonly owner: string | undefined;

  constructor(
    shortcut: string,
    accelerator: string,
    reason: ShortcutErrorReason,
    owner?: string,
    cause?: unknown,
  ) {
    const detail =
      reason === 'duplicate'
        ? `已被快捷键 "${owner}" 占用`
        : reason === 'occupied'
          ? '已被其他应用或系统占用'
          : '按键写法非法';
    super(`[electron-shortcut] 快捷键 "${shortcut}" 注册 ${accelerator} 失败: ${detail}`, {
      cause,
    });
    this.shortcut = shortcut;
    this.accelerator = accelerator;
    this.reason = reason;
    this.owner = owner;
  }
}
