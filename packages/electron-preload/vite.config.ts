import { defineConfig } from 'vite-plus';

export default defineConfig({
  pack: {
    name: 'electron-preload',
    entry: { preload: 'src/index.ts' },
    dts: true,
    format: 'cjs',
    clean: true,
    minify: true,
    deps: { neverBundle: ['electron'] },
  },
});
