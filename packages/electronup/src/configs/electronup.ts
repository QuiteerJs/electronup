import type { CliOptions } from 'electron-builder'
import type { UserConfig as PackUserConfig } from 'vite-plus/pack'
import type { UserConfig } from 'vite'

import type { ElectronupConfig } from '../typings/electronup'
import { getPreloadConfigs } from './preload'
import { store } from '../utils'
import { getBuilderConfig } from './builder'
import { getPackConfig } from './pack'
import { getViteConfig } from './vite'

interface InitConfig extends Omit<ElectronupConfig, 'viteConfig' | 'packConfig' | 'preload' | 'builderConfig'> {
  vite: UserConfig
  pack: PackUserConfig
  preload: PackUserConfig[]
  builder?: CliOptions
}

export async function getElectronupConfig(config: ElectronupConfig) {
  const { viteConfig, packConfig, preload, builderConfig, ...dirConfig } = config

  const vite = getViteConfig(viteConfig || {}, config)
  const pack = getPackConfig(packConfig || {}, config)
  const preloadConfigs = getPreloadConfigs(preload, config)

  const initConfig: InitConfig = { vite, pack, preload: preloadConfigs }

  // --web 只构建渲染进程 , 不需要解析 electron-builder 配置
  if (store.command === 'build' && !store.web) {
    const builder = await getBuilderConfig(builderConfig ?? {}, config)
    initConfig.builder = builder
  }

  return { ...dirConfig, ...initConfig }
}
