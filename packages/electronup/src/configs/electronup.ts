import type { CliOptions } from 'electron-builder'
import type { InlineConfig, UserConfig } from 'vite'

import type { ElectronupConfig } from '../typings/electronup'
import { getPreloadConfigs } from './preload'
import { store } from '../utils'
import { getBuilderConfig } from './builder'
import { getPackConfig } from './pack'
import { getViteConfig } from './vite'

interface InitConfig extends Omit<ElectronupConfig, 'viteConfig' | 'packConfig' | 'preload' | 'builderConfig'> {
  vite: UserConfig
  pack: InlineConfig
  preload: InlineConfig[]
  builder?: CliOptions
}

export async function getElectronupConfig(config: ElectronupConfig) {
  const { viteConfig, packConfig, preload, builderConfig, ...dirConfig } = config

  const vite = getViteConfig(viteConfig || {}, config)
  // --web 只构建渲染进程 , 跳过主进程 / preload 配置生成 ( 也避免无用的 .env 读取 )
  const webOnly = store.command === 'build' && store.web
  const pack = webOnly ? {} : getPackConfig(packConfig || {}, config)
  const preloadConfigs = webOnly ? [] : getPreloadConfigs(preload, config)

  const initConfig: InitConfig = { vite, pack, preload: preloadConfigs }

  // --web 只构建渲染进程 , 不需要解析 electron-builder 配置
  if (store.command === 'build' && !store.web) {
    const builder = await getBuilderConfig(builderConfig ?? {}, config)
    initConfig.builder = builder
  }

  return { ...dirConfig, ...initConfig }
}
