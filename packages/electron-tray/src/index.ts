import { createTrayManager } from './manager';

export type {
  TrayBoundsClickHandler,
  TrayClickHandler,
  TrayConflictStrategy,
  TrayController,
  TrayDropFilesHandler,
  TrayEventContext,
  TrayIconMap,
  TrayIconOption,
  TrayIconOptions,
  TrayIconSource,
  TrayMenuTemplate,
  TrayOptions,
  TrayReactiveProps,
  TraySimpleHandler,
} from './types';
export type { TrayState } from './tray';
export { isIconMap, isNativeImage, resolveIcon } from './icon';
export { TrayStore } from './store';
export { createTrayManager } from './manager';
export { createTray, createTrayState, toController } from './tray';

/**
 * 开箱即用的全局托盘管理器
 *
 * @example
 * ```ts
 * import { trays } from '@quiteer/electron-tray'
 *
 * trays.create({
 *   name: 'main',
 *   icon: { idle: 'icons/tray.png', syncing: 'icons/tray-sync.png' },
 *   tooltip: '我的应用',
 *   contextMenu: [
 *     { label: '退出', click: () => app.quit() }
 *   ]
 * })
 *
 * // 任意位置取用并操作
 * trays.get('main')?.setToolTip('同步中')
 * trays.setState('main', 'syncing')
 * ```
 */
export const trays = createTrayManager();
