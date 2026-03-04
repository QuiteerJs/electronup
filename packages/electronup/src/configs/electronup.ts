import type { CliOptions } from 'electron-builder'
import type { UserConfig as TsdownUserConfig } from 'tsdown'
import type { UserConfig } from 'vite'

import type { ElectronupConfig } from '../typings/electronup'
import { store } from '../utils'
import { getBuilderConfig } from './builder'
import { getTsdownConfig } from './tsdown'
import { getViteConfig } from './vite'

interface InitConfig extends Omit<ElectronupConfig, 'viteConfig' | 'tsdownConfig' | 'preload' | 'builderConfig'> {
  vite: UserConfig
  tsdown: TsdownUserConfig
  preload?: TsdownUserConfig | TsdownUserConfig[]
  builder?: CliOptions
}

export async function getElectronupConfig(config: ElectronupConfig) {
  const { viteConfig, tsdownConfig, preload, builderConfig, ...dirConfig } = config

  const vite = getViteConfig(viteConfig || {}, config)
  const tsdown = getTsdownConfig(tsdownConfig || {}, config)

  const initConfig: InitConfig = { vite, tsdown }

  if (store.command === 'build') {
    const builder = await getBuilderConfig(builderConfig, config)
    initConfig.builder = builder
  }

  preload && (initConfig.preload = preload)

  return { ...dirConfig, ...initConfig }
}
