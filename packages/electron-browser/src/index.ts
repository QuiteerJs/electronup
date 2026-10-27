import { createWindowManager } from './manager';

export type {
  WindowConflictStrategy,
  WindowController,
  WindowOptions,
  WindowReactiveProps,
} from './types';
export { WinStore } from './store';
export { createWindowManager } from './manager';
export { createWindow, toController } from './window';

/**
 * 开箱即用的全局窗口管理器
 *
 * @example
 * ```ts
 * import { windows } from '@quiteer/electron-browser'
 *
 * windows.create({ name: 'main', width: 1200, height: 800, url: 'https://example.com' })
 *
 * // 任意位置取窗操作
 * windows.get('main')?.webContents.send('ping')
 * ```
 */
export const windows = createWindowManager();
