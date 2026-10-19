import type { Configuration } from 'electron-builder'
import type { UserConfig as Options } from 'vite-plus/pack'
import type { UserConfig } from 'vite'

export interface ViteConfig extends Omit<UserConfig, 'publicDir' | 'ssr'> { }

export interface TsdownConfig {
  external?: (string | RegExp)[]
  noExternal?: (string | RegExp)[]
}

export interface BuilderConfig extends Configuration { }

export interface ElectronupConfig {
  viteConfig?: ViteConfig
  tsdownConfig?: TsdownConfig

  /**
   * preload 脚本构建配置 ( tsdown ) , 可传单个配置或配置数组
   *
   * 预置项 : 默认 cjs 格式 ( Electron preload 要求 CommonJS ) ,
   * 输出到 resourceDir 与主进程同目录 , 注入与主进程一致的环境变量 ,
   * external 默认包含 electron
   */
  preload?: Options | Options[]
  builderConfig: BuilderConfig

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
   * 资源构建输出目录
   * @default 'dist'
   */
  resourceDir?: string

  /**
   * electron-builder 输出目录
   * @default 'out'
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
