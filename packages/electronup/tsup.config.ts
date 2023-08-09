import type { Options } from 'tsup'
import { defineConfig } from 'tsup'

const config: Options = {
  splitting: false,
  clean: true
}

const external = ['electron', 'esbuild', 'electron-builder', 'vite', 'tsup']

export default defineConfig(() => [
  {
    ...config,
    name: 'electronup-api',
    outDir: 'dist/client',
    entry: ['index.ts'],
    format: ['esm', 'cjs'],
    external,
    dts: true
  },
  {
    ...config,
    name: 'electronup-cli',
    outDir: 'dist/bin',
    format: ['cjs'],
    external,
    entry: { electronup: 'cli.ts' }
  }
])
