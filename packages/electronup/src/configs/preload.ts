import type { UserConfig } from 'vite-plus/pack'
import type { ElectronupConfig } from '../typings/electronup'
import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { DefaultDirs, store } from '../utils'
import { globalProcessPlugin, injectEnv } from './pack'

type ExternalOption = NonNullable<UserConfig['external']>

/**
 * 在用户的 external 基础上始终保留 electron , 兼容字符串 / 正则 / 数组 / 函数形态
 *
 * 直接覆盖会把 electron 打进 preload ( 生成 require_electron ) , 与主进程的合并行为不一致
 */
export function withElectronExternal(external: ExternalOption | undefined): ExternalOption {
  if (external === undefined)
    {return ['electron']}

  if (typeof external === 'function')
    {return (id, parentId, isResolved) => id === 'electron' || external(id, parentId, isResolved)}

  return ['electron', ...(Array.isArray(external) ? external : [external])]
}

/**
 * 预检 preload 配置 : 每项都需要 entry , 不含通配符的入口文件必须存在 ; 不合法时抛错
 *
 * 在启动 dev server / 清理之前调用 , 避免 vite 已启动或产物已清空后才报 `No input files`
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
      if (typeof file !== 'string' || /[*?{}[\]!]/.test(file))
        {continue}
      const path = resolve(store.root, file)
      if (!existsSync(path))
        {throw new Error(`${label} 的入口文件不存在 : ${path}`)}
    }
  })
}

/**
 * 归一化 preload 构建配置 , 补齐与主进程一致的预置项
 *
 * 输出目录默认与主进程相同 ( resourceDir ) , electron-builder 的 files 已覆盖该目录
 * 默认 format 为 cjs , Electron 的 preload 脚本要求 CommonJS
 */
export function getPreloadConfigs(configs: ElectronupConfig['preload'], allConfig: ElectronupConfig): UserConfig[] {
  const list = configs == null ? [] : Array.isArray(configs) ? configs : [configs]
  const { root, minify } = store

  return list.map((config) => {
    const { deps } = config
    // external 已弃用 , 默认走 deps.neverBundle ; 两者不能同时设置 :
    // 只有用户自己写了 external 时才沿用 external , 否则把 electron 合并进 neverBundle ( true 表示全部不打包 , 已包含 electron )
    const neverBundle = deps?.neverBundle
    const externalConfig: Pick<UserConfig, 'external' | 'deps'> = config.external !== undefined && neverBundle === undefined
      ? { external: withElectronExternal(config.external) }
      : { deps: { ...deps, neverBundle: neverBundle === true ? true : withElectronExternal(neverBundle) } }

    return Object.assign({ minify, dts: false, clean: false, format: 'cjs' }, config, externalConfig, {
      outDir: resolve(root, config.outDir || allConfig.resourceDir || DefaultDirs.resourceDir),
      env: { ...injectEnv(), ...config.env },
      plugins: [globalProcessPlugin(), ...[config.plugins ?? []].flat()],
    })
  })
}
