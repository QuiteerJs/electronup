import type { ElectronupConfig } from '../typings/electronup'
import { getPortPromise } from 'portfinder'
import { createServer } from 'vite'
import { electronupConfig } from '../transform'
import { DefaultDirs, store } from '../utils'
import { cleanOutputDirsOrExit } from './clean'

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

  const viteDevServer = await createServer({ configFile: false, ...initConfig.vite })

  void viteDevServer.listen(p).then(() => viteDevServer.printUrls())

  const { build } = await import('vite-plus/pack')
  // preload 先于主进程构建完成 , 保证 electron 启动时 preload 已写入磁盘
  for (const preloadConfig of initConfig.preload)
    {await build(preloadConfig)}
  await build(initConfig.pack)
}
