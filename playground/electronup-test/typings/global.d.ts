interface Window {
  $ipc: import('@quiteer/electron-preload').PreloadIpc & import('@quiteer/electron-ipc/web').ExpandPreloadIpc
  $clipboard: import('@quiteer/electron-preload').PreloadClipboard
  $webFrame: import('@quiteer/electron-preload').PreloadWebFrame
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module '*.css' {}

interface ImportMetaEnv {
  readonly NODE_ENV: 'development' | 'production' | 'test' | 'staging'
  readonly RENDER_PORT: string
  readonly [key: string]: string | undefined
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
