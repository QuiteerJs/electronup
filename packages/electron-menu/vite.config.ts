import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite-plus';

export default defineConfig({
  test: {
    // 单元测试不启动 electron , 统一换成 test/stubs 下的替身
    alias: {
      electron: fileURLToPath(new URL('test/stubs/electron.ts', import.meta.url)),
    },
  },
  pack: [
    {
      name: 'electron-menu',
      entry: ['src/index.ts'],
      dts: true,
      clean: true,
      format: 'esm',
      fixedExtension: false,
      deps: { neverBundle: ['electron'] },
    },
  ],
});
