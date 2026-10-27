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
  /** 渲染层 `$clipboard` 的类型 */
  type PreloadClipboard = import('./dist/preload.cjs').PreloadClipboard;
  /** 渲染层 `$webFrame` 的类型 */
  type PreloadWebFrame = import('./dist/preload.cjs').PreloadWebFrame;
}

export = preloadPath;
