import { createShortcutManager } from './manager';

export type {
  ShortcutConflictStrategy,
  ShortcutContext,
  ShortcutController,
  ShortcutHandler,
  ShortcutOptions,
  ShortcutScope,
  ShortcutWindow,
} from './types';
export type { ShortcutManager } from './manager';
export type { ShortcutErrorReason } from './error';
export { ShortcutError } from './error';
export { createShortcutManager } from './manager';

/**
 * 开箱即用的全局快捷键管理器
 *
 * @example
 * ```ts
 * import { shortcuts } from '@quiteer/electron-shortcut'
 *
 * shortcuts.register({
 *   name: 'toggle',
 *   accelerator: 'CmdOrCtrl+Shift+K',
 *   handler: () => windows.focus('main'),
 * })
 *
 * shortcuts.get('toggle')!.accelerator = 'Alt+Space' // 换绑, 失败自动回滚
 * shortcuts.disable('toggle')
 * ```
 */
export const shortcuts = createShortcutManager();
