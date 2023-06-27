
import { Configuration } from 'electron-builder';
import type { AliasOptions, PluginOption, ResolveOptions, UserConfig } from 'vite';
import type { Options } from 'tsup'

export interface ViteConfig {
  resolve?: ResolveOptions & {
    alias?: AliasOptions;
  }
  plugins?: PluginOption[]
  build?:UserConfig['build']
  viteOptions?: Omit<UserConfig, 'plugins' | 'resolve' | 'publicDir'| 'build'>
}

export interface TsupConfig {
  target?: Options['target'];
  external?: (string | RegExp)[];
  noExternal?: (string | RegExp)[];
}

export interface BuilderConfig extends Configuration { }

export interface ElectronupConfig {
  viteConfig?: ViteConfig
  tsupConfig?: TsupConfig
  preloadTsup?: Options | Options[]
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

export type ElectronupConfigFn = (env: ConfigEnv) => ElectronupConfig
export type UserElectronupConfig = ElectronupConfig | ElectronupConfigFn


