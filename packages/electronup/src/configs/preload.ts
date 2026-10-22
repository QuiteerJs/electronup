import type { UserConfig } from 'vite-plus/pack'
import type { ElectronupConfig } from '../typings/electronup'
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
    // external 与 deps.neverBundle 不能同时设置 : 用户用了 neverBundle 时把 electron 合并进去 ( true 表示全部不打包 , 已包含 electron )
    const externalConfig: Pick<UserConfig, 'external' | 'deps'> = deps?.neverBundle !== undefined
      ? { deps: { ...deps, neverBundle: deps.neverBundle === true ? true : withElectronExternal(deps.neverBundle) } }
      : { external: withElectronExternal(config.external) }

    return Object.assign({ minify, dts: false, clean: false, format: 'cjs' }, config, externalConfig, {
      outDir: resolve(root, config.outDir || allConfig.resourceDir || DefaultDirs.resourceDir),
      env: { ...injectEnv(), ...config.env },
      plugins: [globalProcessPlugin(), ...[config.plugins ?? []].flat()],
    })
  })
}
