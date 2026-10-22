import type { UserConfig } from 'vite-plus/pack'
import type { ElectronupConfig } from '../typings/electronup'
import { resolve } from 'node:path'
import { DefaultDirs, store } from '../utils'
import { globalProcessPlugin, injectEnv } from './pack'

/**
 * 归一化 preload 构建配置 , 补齐与主进程一致的预置项
 *
 * 输出目录默认与主进程相同 ( resourceDir ) , electron-builder 的 files 已覆盖该目录
 * 默认 format 为 cjs , Electron 的 preload 脚本要求 CommonJS
 */
export function getPreloadConfigs(configs: ElectronupConfig['preload'], allConfig: ElectronupConfig): UserConfig[] {
  const list = configs == null ? [] : Array.isArray(configs) ? configs : [configs]
  const { root, minify } = store

  return list.map(config => (Object.assign({minify,dts:false,clean:false,external:[`electron`],format:`cjs`}, config, {outDir:resolve(root,config.outDir||allConfig.resourceDir||DefaultDirs.resourceDir),env:{...injectEnv(),...config.env},plugins:[globalProcessPlugin(),...[config.plugins ?? []].flat()]})))
}
