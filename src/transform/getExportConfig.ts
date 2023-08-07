import type { ElectronupConfig, ElectronupConfigFn, UserElectronupConfig } from '../typings/electronup'
import { getElectronupConfig } from '../configs/electronup'
import { store } from '../utils'

/**
 * Description  解析用户自定义配置···
 * @param {any} config:UserElectronupConfig
 * @returns {any}
 */
const exportElectronupConfig = async (config: UserElectronupConfig): Promise<ElectronupConfig> => {
  const typeStr = typeof config
  if (typeStr === 'function') {
    const option = await (config as ElectronupConfigFn)({ command: store.command, root: store.root })
    return option
  }

  if (typeStr === 'object')
    return config as ElectronupConfig

  throw new Error('electronup 配置错误,解析失败！')
}

export const electronupConfig = async (config: UserElectronupConfig) => getElectronupConfig(await exportElectronupConfig(config))
