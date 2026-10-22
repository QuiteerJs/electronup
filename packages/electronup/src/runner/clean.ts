import process from 'node:process'
import { cleanDirs, store } from '../utils'

/**
 * 校验并清空输出目录 , 不合法或被占用时打印原因并以 1 退出 ( 不删除任何内容 )
 *
 * 必须在配置执行与目标校验之后调用
 */
export function cleanOutputDirsOrExit(targets: string[]) {
  try {
    cleanDirs(targets, { root: store.root })
  }
  catch (error: any) {
    console.error('err: ', error.message)
    process.exit(1)
  }
}
