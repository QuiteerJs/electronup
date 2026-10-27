import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite-plus';

export default defineConfig({
  pack: [
    {
      name: 'electron-browser',
      entry: ['src/index.ts'],
      dts: true,
      clean: true,
      format: 'esm',
      fixedExtension: false,
      deps: { neverBundle: ['electron'] },
    },
    {
      name: 'electron-browser-test',
      entry: [fileURLToPath(new URL('test/browser.test.ts', import.meta.url))],
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
