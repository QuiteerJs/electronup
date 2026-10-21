import type { UserConfig } from 'vite'
import type { ElectronupConfig, ViteConfig } from '../typings/electronup'
import { resolve } from 'node:path'
import { DefaultDirs, store } from '../utils'

export function getViteConfig(config: ViteConfig, allConfig: ElectronupConfig) {
  const { root, minify } = store

  const defaultConfig: UserConfig = {
    base: './',
    ...config,
    build: {
      ...config?.build,
      minify,
      outDir: resolve(root, allConfig.resourceDir || DefaultDirs.resourceDir),
      // vite-plus-core 未导出 'vite/modulepreload-polyfill' 子路径 , 关闭 polyfill 规避解析报错 ( 渲染进程为 Chromium , 原生支持 )
      modulePreload: config?.build?.modulePreload ?? { polyfill: false },
    },
    root: allConfig.renderDir || DefaultDirs.renderDir,
    publicDir: resolve(root, allConfig.publicDir || DefaultDirs.publicDir),
  }

  return defaultConfig
}
