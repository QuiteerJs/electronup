import { defineConfig } from 'tsup'

export default defineConfig({
  name: 'electron-preload',
  entry: ['src/index.ts'],
  dts: true,
  splitting: false,
  clean: true,
  format: ['esm'],
  external: ['electron']
})
