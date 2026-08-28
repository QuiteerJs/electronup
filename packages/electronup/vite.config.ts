import { defineConfig } from 'vite-plus';

export default defineConfig({
  pack: [
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
],
});
