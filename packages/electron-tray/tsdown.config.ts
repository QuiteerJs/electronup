import { defineConfig } from 'tsdown'

export default defineConfig({
  name: 'electron-tray',
  entry: ['src/index.ts'],
  dts: true,
  splitting: false,
  clean: true,
  format: 'esm',
  fixedExtension: false,
  deps: { neverBundle: ['electron'] }
})
