import type { CliOptions } from 'electron-builder'
import type { UserConfig as TsdownUserConfig } from 'vite-plus/pack'
import type { UserConfig } from 'vite'

import type { ElectronupConfig } from '../typings/electronup'
import { getPreloadConfigs } from './preload'
import { store } from '../utils'
import { getBuilderConfig } from './builder'
import { getTsdownConfig } from './tsdown'
import { getViteConfig } from './vite'

interface InitConfig extends Omit<ElectronupConfig, 'viteConfig' | 'tsdownConfig' | 'preload' | 'builderConfig'> {
  vite: UserConfig
  tsdown: TsdownUserConfig
  preload: TsdownUserConfig[]
  builder?: CliOptions
}

export async function getElectronupConfig(config: ElectronupConfig) {
  const { viteConfig, tsdownConfig, preload, builderConfig, ...dirConfig } = config

  const vite = getViteConfig(viteConfig || {}, config)
  const tsdown = getTsdownConfig(tsdownConfig || {}, config)
  const preloadConfigs = getPreloadConfigs(preload, config)

  const initConfig: InitConfig = { vite, tsdown, preload: preloadConfigs }

  if (store.command === 'build') {
    const builder = await getBuilderConfig(builderConfig, config)
    initConfig.builder = builder
  }

  return { ...dirConfig, ...initConfig }
}
