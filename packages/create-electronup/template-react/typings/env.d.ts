/// <reference types="vite/client" />

declare interface ImportMetaEnv {
  readonly VITE_MODE_TEXT: string
  readonly VITE_HELLO: string
}

declare interface ImportMeta {
  readonly env: ImportMetaEnv
}

// 主进程环境变量
declare namespace NodeJS {
  export interface ProcessEnv {
    readonly NODE_ENV: 'development' | 'production'
    readonly RENDER_PORT?: string
    readonly VITE_HELLO: string
    readonly VITE_MODE_TEXT: string
  }
}
