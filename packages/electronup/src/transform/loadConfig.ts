import type { ElectronupConfig } from '../typings/electronup'
import process from 'node:process'
import { getConfig } from './getConfig'
import { resolveElectronupConfig } from './getExportConfig'

/**
 * 读取并执行配置文件 ; 失败时只打印简洁错误 ( 含原因 ) 并以 1 退出 ,
 * 设置环境变量 DEBUG 时额外打印完整堆栈
 *
 * 依赖 store.command , 调用前需先设置
 */
export async function loadConfigOrExit(configFile: string | undefined): Promise<ElectronupConfig> {
  try {
    return await resolveElectronupConfig(await getConfig(configFile))
  }
  catch (error: any) {
    console.error('err: ', error?.message ?? error)
    if (error?.cause)
      {console.error('原因 : ', error.cause?.message ?? error.cause)}

    if (process.env.DEBUG)
      {console.error(error)}
    else
      {console.error('( 设置环境变量 DEBUG=1 可查看完整堆栈 )')}

    return process.exit(1)
  }
}
