import type { UserConfig } from 'vite'
import type { ElectronupConfig, ViteConfig } from '../typings/electronup'
import { resolve } from 'node:path'
import { DefaultDirs, store } from '../utils'

export function getViteConfig(config: ViteConfig, allConfig: ElectronupConfig) {
  const { root, minify, mode } = store

  const defaultConfig: UserConfig = {
    base: './',
    // 跟随 -m 指定的模式 , 与主进程 / preload 读取同一组 .env.{mode}
    mode,
    // root 为 renderDir , Vite 默认只在 renderDir 下找 .env ; 改为项目根 , 与主进程 / preload 一致
    envDir: root,
    ...config,
    build: {
      ...config?.build,
      minify,
      outDir: resolve(root, allConfig.resourceDir || DefaultDirs.resourceDir),
      // resourceDir 由 electronup 在构建前清理 ; 显式关闭可避免 vite 提示 outDir 不在 root 内、不会被清空
      emptyOutDir: config?.build?.emptyOutDir ?? false,
      // vite-plus-core 未导出 'vite/modulepreload-polyfill' 子路径 , 关闭 polyfill 规避解析报错 ( 渲染进程为 Chromium , 原生支持 )
      modulePreload: config?.build?.modulePreload ?? { polyfill: false },
    },
    root: allConfig.renderDir || DefaultDirs.renderDir,
    publicDir: resolve(root, allConfig.publicDir || DefaultDirs.publicDir),
  }

  return defaultConfig
}
