import { resolve } from 'path'
import type { UserConfig } from 'vite'
import type { ElectronupConfig, ViteConfig } from '../typings/electronup'
import { DefaultDirs, store } from '../utils'

export function getViteConfig(config: ViteConfig, allConfig: ElectronupConfig) {
  const { root, minify } = store

  const defaultConfig: UserConfig = {
    base: './',
    ...config,
    build: {
      ...config?.build,
      minify: minify && 'esbuild',
      outDir: resolve(root, allConfig.resourceDir || DefaultDirs.resourceDir)
    },
    root: allConfig.renderDir || DefaultDirs.renderDir,
    publicDir: resolve(root, allConfig.publicDir || DefaultDirs.publicDir)
  }

  return defaultConfig
}

