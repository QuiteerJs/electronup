import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite-plus';

export default defineConfig({
  test: {
    // 单元测试不启动 electron , 统一换成 test/stubs 下的替身
    alias: {
      electron: fileURLToPath(new URL('test/stubs/electron.ts', import.meta.url)),
    },
  },
  pack: [
    {
      name: 'electron-preload',
      entry: { preload: 'src/index.ts' },
      dts: true,
      format: 'cjs',
      // 与主进程入口共用 dist, 各自只清理自己的产物
      clean: ['dist/preload*'],
      minify: true,
      deps: { neverBundle: ['electron'] },
    },
    {
      // 主进程入口: createPreload 与剪贴板处理器, ESM / CJS 主进程都可引用
      name: 'electron-preload-main',
      entry: { main: 'src/main.ts' },
      dts: true,
      format: ['esm', 'cjs'],
      fixedExtension: false,
      platform: 'node',
      shims: true,
      clean: ['dist/main*'],
      minify: true,
      deps: { neverBundle: ['electron'] },
    },
  ],
});
