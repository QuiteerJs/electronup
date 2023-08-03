import type { Options } from 'tsup'
import { defineConfig } from 'tsup'

const config: Options = {
  splitting: false,
  clean: true
}

export default defineConfig([
  {
    ...config,
    name: 'electronup-api',
    outDir: 'dist/client',
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true
  },
  {
    ...config,
    name: 'electronup-cli',
    outDir: 'dist/bin',
    format: ['cjs'],
    entry: { electronup: 'src/cli.ts' }
  }
])
