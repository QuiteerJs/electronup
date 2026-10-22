import path from 'node:path'
import process from 'node:process'
import pc from 'picocolors'
import { cleanDirs, store } from '../utils'

/**
 * 校验并清空输出目录 , 不合法或被占用时打印原因并以 1 退出 ( 不删除任何内容 )
 *
 * 必须在配置执行与目标校验之后调用 ; 清空后逐个打印目录 , 让 `--web` 清掉主进程 / preload 产物这类影响可见
 */
export function cleanOutputDirsOrExit(targets: string[]) {
  let cleaned: string[]
  try {
    cleaned = cleanDirs(targets, { root: store.root })
  }
  catch (error: any) {
    console.error('err: ', error.message)
    process.exit(1)
  }

  for (const dir of cleaned) {
    const display = path.relative(store.root, dir) || dir
    // oxlint-disable-next-line no-console
    console.info(pc.dim(`[electronup] 已清空 ${display.startsWith('..') ? dir : display}`))
  }
}
