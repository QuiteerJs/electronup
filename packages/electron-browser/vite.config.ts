import { defineConfig } from 'vite-plus';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  pack: [
    {
      name: 'electron-browser',
      entry: ['src/index.ts'],
      dts: true,
      splitting: false,
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
      dts: false,
      format: 'esm',
      fixedExtension: false,
      platform: 'node',
      clean: true,
    },
  ],
});
