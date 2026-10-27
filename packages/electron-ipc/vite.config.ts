import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite-plus';

export default defineConfig({
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
    {
      name: 'electron-ipc-test',
      entry: [
        fileURLToPath(new URL('test/ipc.test.ts', import.meta.url)),
        fileURLToPath(new URL('test/contract.test.ts', import.meta.url)),
      ],
      outDir: fileURLToPath(new URL('test/.out', import.meta.url)),
      alias: {
        electron: fileURLToPath(new URL('test/stubs/electron.ts', import.meta.url)),
      },
      dts: false,
      format: 'esm',
      fixedExtension: false,
      platform: 'node',
      clean: true,
    },
  ],
});
