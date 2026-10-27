import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vite-plus'

export default defineConfig({
  test: {
    // 单元测试不启动 electron , 统一换成 test/stubs 下的替身
    alias: {
      electron: fileURLToPath(new URL('test/stubs/electron.ts', import.meta.url)),
    },
  },
  pack: [
    {
      name: 'electron-ipc',
      entry: ['src/index.ts'],
      dts: true,
      clean: true,
      minify: true,
      format: 'esm',
      fixedExtension: false,
      deps: { neverBundle: ['electron'] },
    },
    {
      // 渲染层入口: 只有枚举与类型, 不依赖 electron / node
      name: 'electron-ipc-web',
      entry: { index: 'src/web.ts' },
      dts: true,
      outDir: 'web',
      clean: true,
      minify: true,
      format: 'esm',
      fixedExtension: false,
    },
  ],
})
