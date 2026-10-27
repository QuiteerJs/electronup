interface Window {
  // 叠上内置通道的精确签名, 写错窗口操作名会类型报错
  $ipc: import('@quiteer/electron-ipc/web').WithIpcChannels<
    import('@quiteer/electron-preload').PreloadIpc
  >;
  $webFrame: import('@quiteer/electron-preload').PreloadWebFrame;
  $clipboard?: import('@quiteer/electron-preload').PreloadClipboard;
}
