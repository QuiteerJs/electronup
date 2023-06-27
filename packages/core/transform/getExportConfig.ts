import type { ElectronupConfig, ElectronupConfigFn, UserElectronupConfig } from '../typings/electronup'
import { getElectronupConfig } from '../default/electronup.config'
import { store } from '../utils'

/**
 * Description  解析用户自定义配置···
 * @param {any} config:UserElectronupConfig
 * @returns {any}
 */
const exportElectronupConfig = (config: UserElectronupConfig): ElectronupConfig => {
  const typeStr = typeof config
  if (typeStr === 'function') {
    const option = (config as ElectronupConfigFn)({ command: store.command, root: store.root })
    return option
  }

  if (typeStr === 'object')
    return config as ElectronupConfig

  throw new Error('electronup 配置错误,解析失败！')
}

export const electronupConfig = (config: UserElectronupConfig) => getElectronupConfig(exportElectronupConfig(config))
