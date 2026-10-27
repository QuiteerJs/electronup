import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite-plus';

export default defineConfig({
  pack: [
    {
      name: 'electron-preload',
      entry: { preload: 'src/index.ts' },
      dts: true,
      format: 'cjs',
      clean: true,
      minify: true,
      deps: { neverBundle: ['electron'] },
    },
    {
      name: 'electron-preload-test',
      entry: [fileURLToPath(new URL('test/preload.test.ts', import.meta.url))],
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
