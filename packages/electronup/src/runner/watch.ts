import type { InlineConfig } from 'vite'
import type { ElectronupConfig } from '../typings/electronup'
import process from 'node:process'
import { getPortPromise } from 'portfinder'
import { createServer } from 'vite'
import { electronupConfig } from '../transform'
import { DefaultDirs, store } from '../utils'
import { cleanOutputDirsOrExit } from './clean'

/**
 * 创建 vite dev server , 并在 stdin 非 TTY 时移除 vite 注册的 stdin 'end' 监听
 *
 * vite 在非 CI 环境会把 stdin 'end' 当作父进程退出信号并以 0 退出 ;
 * stdin 为 ignore / 已关闭 ( 后台进程、IDE task runner ) 时该事件会立即触发 ( 配合 tsdown 的 readline ) ,
 * 导致 dev 在主进程构建完成前就退出 . 只移除本次新增的监听 , 不改动 process.env.CI
 */
export async function createDevServer(config: InlineConfig) {
  const before = new Set(process.stdin.listeners('end'))
  const server = await createServer(config)

  if (!process.stdin.isTTY) {
    for (const listener of process.stdin.listeners('end')) {
      if (!before.has(listener))
        {process.stdin.off('end', listener)}
    }
  }

  return server
}

/**
 * @param options 已执行 / 校验过的配置对象 ( 见 resolveElectronupConfig )
 */
export async function watch(options: ElectronupConfig) {
  // 与 build 共用同一套清理校验 , 不合法的 resourceDir 直接报错退出 , 不删除任何内容
  cleanOutputDirsOrExit([options.resourceDir || DefaultDirs.resourceDir])

  const p = await getPortPromise({
    port: Number(store.port),
  })

  store.port = p

  const initConfig = await electronupConfig(options)

  const viteDevServer = await createDevServer({ configFile: false, ...initConfig.vite })

  void viteDevServer.listen(p).then(() => viteDevServer.printUrls())

  const { build } = await import('vite-plus/pack')
  // preload 先于主进程构建完成 , 保证 electron 启动时 preload 已写入磁盘
  for (const preloadConfig of initConfig.preload)
    {await build(preloadConfig)}
  await build(initConfig.pack)
}
