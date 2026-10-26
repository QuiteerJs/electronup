import type { InlineConfig } from 'vite'
import type { ElectronupConfig } from '../typings/electronup'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { mergeConfig } from 'vite'
import { DefaultDirs, store } from '../utils'
import { createNodeBuildConfig, injectEnv } from './pack'

/**
 * 预检 preload 配置 : 每项都需要 entry , 入口文件必须存在 ; 不合法时抛错
 *
 * 在启动 dev server / 清理之前调用 , 避免 vite 已启动或产物已清空后才报错
 */
export function assertPreloadEntries(configs: ElectronupConfig['preload']) {
  const list = configs == null ? [] : [configs].flat()

  list.forEach((config, index) => {
    const label = Array.isArray(configs) ? `preload[${index}]` : 'preload'
    const { entry } = config
    const files: unknown[] = typeof entry === 'string'
      ? [entry]
      : Array.isArray(entry)
        ? entry
        : entry && typeof entry === 'object' ? Object.values(entry) : []

    if (!files.length)
      {throw new Error(`${label} 缺少 entry , 例如 : preload: { entry: { preload: resolve(__dirname, 'preload/index.ts') } }`)}

    for (const file of files) {
      const path = resolve(store.root, String(file))
      if (!existsSync(path))
        {throw new Error(`${label} 的入口文件不存在 : ${path}`)}
    }
  })
}

/**
 * 归一化 preload 构建配置 , 补齐与主进程一致的预置项 ( 同样走 Vite SSR 构建 )
 *
 * 输出目录默认与主进程相同 ( resourceDir ) , electron-builder 的 files 已覆盖该目录
 * 默认 format 为 cjs , Electron 的 preload 脚本要求 CommonJS ; viteConfig 最后合并 , 用于覆盖其余 Vite 选项
 */
export function getPreloadConfigs(configs: ElectronupConfig['preload'], allConfig: ElectronupConfig): InlineConfig[] {
  const list = configs == null ? [] : Array.isArray(configs) ? configs : [configs]
  const { root, minify } = store

  return list.map((config) => {
    const base = createNodeBuildConfig({
      entry: config.entry,
      outDir: resolve(root, config.outDir || allConfig.resourceDir || DefaultDirs.resourceDir),
      format: config.format ?? 'cjs',
      minify: config.minify ?? minify,
      external: config.external,
      noExternal: config.noExternal,
      env: { ...injectEnv(), ...config.env },
      plugins: [config.plugins ?? []].flat(),
      sourcemap: config.sourcemap,
    })
    return config.viteConfig ? mergeConfig(base, config.viteConfig) : base
  })
}
