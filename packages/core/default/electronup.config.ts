import type { UserConfig } from 'vite'
import type { Options } from 'tsup'
import type { CliOptions } from 'electron-builder'

import { store } from '../utils'
import type { ElectronupConfig } from '../typings/electronup'
import { getBuilderConfig } from './builder.config'
import { getTsupConfig } from './tsup.config'
import { getViteConfig } from './vite.config'

interface InitConfig extends Omit<ElectronupConfig, 'viteConfig' | 'tsupConfig' | 'preloadTsup' | 'builderConfig'> {
  vite: UserConfig
  tsup: Options
  preload?: Options | Options[]
  builder?: CliOptions
}

export async function getElectronupConfig(config: ElectronupConfig) {
  const { viteConfig, tsupConfig, preloadTsup, builderConfig, ...dirConfig } = config

  const vite = getViteConfig(viteConfig || {}, config)
  const tsup = getTsupConfig(tsupConfig || {}, config)

  const initConfig: InitConfig = { vite, tsup }

  if (store.command === 'build') {
    const builder = await getBuilderConfig(builderConfig, config)
    initConfig.builder = builder
  }

  preloadTsup && (initConfig.preload = preloadTsup)

  return { ...dirConfig, ...initConfig }
}
