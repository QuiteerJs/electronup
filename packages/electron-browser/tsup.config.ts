import { defineConfig } from 'tsup'

export default defineConfig({
  name: 'electron-browser',
  entry: ['src/index.ts'],
  dts: true,
  splitting: false,
  clean: true,
  format: ['esm', 'cjs'],
  external: ['electron']
})
