import type { Configuration } from 'electron-builder'
import type { UserConfig as Options } from 'vite-plus/pack'
import type { UserConfig } from 'vite'

export interface ViteConfig extends Omit<UserConfig, 'publicDir' | 'ssr'> { }

export interface PackConfig {
  external?: (string | RegExp)[]
  noExternal?: (string | RegExp)[]
}

export interface BuilderConfig extends Configuration { }

export interface ElectronupConfig {
  viteConfig?: ViteConfig
  packConfig?: PackConfig

  /**
   * preload 脚本构建配置 ( pack ) , 可传单个配置或配置数组
   *
   * 预置项 : 默认 cjs 格式 ( Electron preload 要求 CommonJS ) ,
   * 输出到 resourceDir 与主进程同目录 , 注入与主进程一致的环境变量 ,
   * external 默认包含 electron
   */
  preload?: Options | Options[]
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
