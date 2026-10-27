import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite-plus';

export default defineConfig({
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
    {
      name: 'electron-preload-test',
      entry: [
        fileURLToPath(new URL('test/preload.test.ts', import.meta.url)),
        fileURLToPath(new URL('test/main.test.ts', import.meta.url)),
      ],
      outDir: fileURLToPath(new URL('test/.out', import.meta.url)),
      alias: {
        electron: fileURLToPath(new URL('test/stubs/electron.ts', import.meta.url)),
      },
      // electron 是 peerDependency, 默认不打包; 测试需要把它换成替身打进去
      deps: { alwaysBundle: ['electron'] },
      dts: false,
      format: 'esm',
      fixedExtension: false,
      platform: 'node',
      clean: true,
    },
  ],
});
