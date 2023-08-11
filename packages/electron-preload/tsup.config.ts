import { defineConfig } from 'tsup'

export default defineConfig({
  name: 'electron-preload',
  entry: { preload: 'src/index.ts' },
  dts: true,
  splitting: false,
  clean: true,
  minify: true,
  external: ['electron']
})
