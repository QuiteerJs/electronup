import { defineConfig } from 'vite-plus';

export default defineConfig({
  pack: [
    {
      entry: ['index.ts'],
      dts: true,
      clean: true,
      minify: true,
      format: 'esm',
      fixedExtension: false,
      deps: { neverBundle: ['electron'] },
    },
    {
      entry: ['event-enum/index.ts'],
      dts: true,
      outDir: 'web',
      clean: true,
      minify: true,
      format: 'esm',
      fixedExtension: false,
      deps: { neverBundle: ['electron'] },
    },
  ],
});
