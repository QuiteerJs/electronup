import { defineConfig } from 'tsdown'

export default defineConfig([
  {
    entry: ['src/index.ts'],
    outDir: 'dist/client',
    // format: ['esm', 'cjs'],
    dts: true,
    minify: false,
    clean: true,
  },
  {
    entry: { electronup: 'src/cli.ts' },
    outDir: 'dist/bin',
    // format: ['cjs'],
    minify: false,
    clean: true,
  },
])
