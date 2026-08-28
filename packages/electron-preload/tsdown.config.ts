import { defineConfig } from 'tsdown'

export default defineConfig({
  name: 'electron-preload',
  entry: { preload: 'src/index.ts' },
  dts: true,
  format: 'cjs',
  splitting: false,
  clean: true,
  minify: true,
  deps: { neverBundle: ['electron'] }
})
