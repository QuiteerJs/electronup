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

  viteDevServer.listen(p).then(viteDevServer.printUrls)

  const { build } = await import('tsdown')
  build(initConfig.tsdown)
}
