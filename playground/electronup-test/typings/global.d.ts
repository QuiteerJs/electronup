// 与 preload/index.ts 暴露的对象保持一致
interface Window {
  electronupPreload: {
    platform: NodeJS.Platform
    versions: NodeJS.ProcessVersions
  }
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
