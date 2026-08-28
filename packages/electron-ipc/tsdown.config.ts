import { defineConfig } from 'tsdown'

export default defineConfig([{
  name: 'electron-ipc',
  entry: ['index.ts'],
  dts: true,
  splitting: false,
  clean: true,
  minify: true,
  format: 'esm',
  fixedExtension: false,
  deps: { neverBundle: ['electron'] }
}, {
  name: 'electron-ipc-web',
  entry: ['event-enum/index.ts'],
  dts: true,
  outDir: 'web',
  splitting: false,
  clean: true,
  minify: true,
  format: 'esm',
  fixedExtension: false,
  deps: { neverBundle: ['electron'] }
}])
