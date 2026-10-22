import type { ElectronupConfig, ElectronupConfigExport } from '../typings/electronup'
import { getElectronupConfig } from '../configs/electronup'
import { store } from '../utils'

/**
 * 解析用户导出的配置 : 执行函数式 / 异步函数式导出 , 等待 Promise 导出 ,
 * 并校验最终结果必须是非 null 的普通对象
 *
 * 依赖 store.command / store.root , 调用前需先设置 store.command
 */
export async function resolveElectronupConfig(config: ElectronupConfigExport): Promise<ElectronupConfig> {
  const option = typeof config === 'function'
    ? await config({ command: store.command, root: store.root })
    : await config

  if (option === null || typeof option !== 'object' || Array.isArray(option)) {
    throw new Error('electronup 配置错误,解析失败！配置文件需要导出对象 , 或返回对象的 ( 异步 ) 函数')
  }

  return option
}

export const electronupConfig = async (config: ElectronupConfigExport) => getElectronupConfig(await resolveElectronupConfig(config))
