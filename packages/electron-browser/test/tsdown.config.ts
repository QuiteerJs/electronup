import { fileURLToPath } from 'node:url'
import { defineConfig } from 'tsdown'

/**
 * 把测试打包成单文件后交给 node 执行
 * electron 在打包阶段 alias 到 test/stubs/electron.ts, 无需真实 Electron 环境
 */
export default defineConfig({
  entry: [fileURLToPath(new URL('browser.test.ts', import.meta.url))],
  outDir: fileURLToPath(new URL('.out/', import.meta.url)),
  alias: {
    electron: fileURLToPath(new URL('stubs/electron.ts', import.meta.url))
  },
  dts: false,
  format: 'esm',
  fixedExtension: false,
  platform: 'node'
})
