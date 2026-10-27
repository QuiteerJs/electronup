/**
 * 预加载脚本的绝对路径, 直接交给 webPreferences.preload。
 *
 * 包默认导出即该字符串: `import preloadPath from '@quiteer/electron-preload'`
 */
declare const preloadPath: string;

// 与上方 const 做声明合并，用于挂载渲染层类型，TS 允许但 lint 无法识别
// eslint-disable-next-line @typescript-eslint/no-redeclare
declare namespace preloadPath {
  /** 渲染层 `$ipc` 的类型 */
  type PreloadIpc = import('./dist/preload.cjs').PreloadIpc;
  /** `$ipc.on` / `$ipc.once` 回调的事件参数 */
  type PreloadIpcEvent = import('./dist/preload.cjs').PreloadIpcEvent;
  /** `$ipc.on` / `$ipc.once` 的回调类型 */
  type PreloadIpcListener = import('./dist/preload.cjs').PreloadIpcListener;
  /** 渲染层 `$clipboard` 的类型, 需 `createPreload({ clipboard: true })` 才会暴露 */
  type PreloadClipboard = import('./dist/preload.cjs').PreloadClipboard;
  /** `$clipboard.read` / `$clipboard.write` 的条目类型 */
  type PreloadClipboardData = import('./dist/preload.cjs').PreloadClipboardData;
  /** `$clipboard` 方法末位的剪贴板类型参数 */
  type PreloadClipboardType = import('./dist/preload.cjs').PreloadClipboardType;
  /** `createPreload({ channels })` 的通道白名单 */
  type PreloadChannels = import('./dist/preload.cjs').PreloadChannels;
  /** 渲染层 `$webFrame` 的类型 */
  type PreloadWebFrame = import('./dist/preload.cjs').PreloadWebFrame;
}

export = preloadPath;
