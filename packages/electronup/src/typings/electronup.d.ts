import type { Configuration } from 'electron-builder'
import type { PluginOption, UserConfig } from 'vite'

export interface ViteConfig extends Omit<UserConfig, 'publicDir' | 'ssr'> { }

export interface PackConfig {
  /** 不参与构建的模块 , electron 与 Node 内置模块始终不参与 */
  external?: (string | RegExp)[]
  /** 强制打进产物的模块 , 默认只有 package.json 的 dependencies / peerDependencies / optionalDependencies 不参与构建 */
  noExternal?: (string | RegExp)[]
}

/** 单个 preload 脚本的构建配置 ( Vite SSR 构建 ) */
export interface PreloadConfig {
  /** 入口 , 对象形式的 key 即输出文件名 ( 例如 `preload` -> `preload.cjs` ) */
  entry: string | string[] | Record<string, string>
  /**
   * 输出目录
   * @default resourceDir
   */
  outDir?: string
  /**
   * 输出格式 , esm 输出为 `.mjs`
   * @default 'cjs'
   */
  format?: 'cjs' | 'esm'
  /** 默认跟随命令行 `--no-minify` */
  minify?: boolean
  sourcemap?: boolean | 'inline' | 'hidden'
  /** 不参与构建的模块 , 始终包含 electron */
  external?: (string | RegExp)[]
  /** 强制打进产物的模块 , true 表示除 electron / Node 内置模块外全部打包 */
  noExternal?: (string | RegExp)[] | true
  /** 额外注入的环境变量 , 优先于 .env */
  env?: Record<string, string>
  /** Vite 插件 , 追加在 electronup 内置插件之后 */
  plugins?: PluginOption[]
  /** 其余 Vite 配置 , 最后通过 mergeConfig 合并 */
  viteConfig?: UserConfig
}

export interface BuilderConfig extends Configuration { }

export interface ElectronupConfig {
  viteConfig?: ViteConfig
  packConfig?: PackConfig

  /**
   * preload 脚本构建配置 ( Vite ) , 可传单个配置或配置数组
   *
   * 预置项 : 默认 cjs 格式 ( Electron preload 要求 CommonJS ) ,
   * 输出到 resourceDir 与主进程同目录 , 注入与主进程一致的环境变量 ,
   * external 默认包含 electron
   */
  preload?: PreloadConfig | PreloadConfig[]
  builderConfig?: BuilderConfig

  /**
   * 渲染进程入口目录
   * @default 'render'
   */
  renderDir?: string

  /**
   * 主进程入口目录
   * @default 'main'
   */
  mainDir?: string

  /**
   * 静态资源目录
   * @default 'public'
   */
  publicDir?: string

  /**
   * 动态库目录
   * @default 'lib'
   */
  libDir?: string

  /**
   * 资源构建输出目录 ( 渲染进程、主进程、preload ) , 构建前会被清空
   * @default 'dist/resource'
   */
  resourceDir?: string

  /**
   * electron-builder 输出目录 , `build` ( 非 `--web` ) 前会被清空 ;
   * 配置了 `builderConfig.directories.output` 时以后者为准
   * @default 'dist/out'
   */
  outDir?: string
}

export interface ConfigEnv {
  command: 'build' | 'serve'
  root: string
}

export type ElectronupConfigFnObject = (env: ConfigEnv) => ElectronupConfig
export type ElectronupConfigFnPromise = (env: ConfigEnv) => Promise<ElectronupConfig>
export type ElectronupConfigFn = (env: ConfigEnv) => ElectronupConfig | Promise<ElectronupConfig>

export type ElectronupConfigExport
  = | ElectronupConfig
    | Promise<ElectronupConfig>
    | ElectronupConfigFnObject
    | ElectronupConfigFnPromise
    | ElectronupConfigFn
