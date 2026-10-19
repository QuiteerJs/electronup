import type { ElectronupConfig } from '../typings/electronup'
import { getPortPromise } from 'portfinder'
import { createServer } from 'vite'
import { electronupConfig } from '../transform'
import { store } from '../utils'

export async function watch(options: ElectronupConfig) {
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
  await build(initConfig.tsdown)
}
