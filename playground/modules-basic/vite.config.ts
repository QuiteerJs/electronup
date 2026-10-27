import { defineConfig } from 'vite-plus';

export default defineConfig({
  pack: [
    {
      // 主进程: 依赖保持外部引用, preloadPath 要按包的安装位置解析
      name: 'playground-main',
      entry: { main: 'src/main.ts' },
      format: 'esm',
      fixedExtension: false,
      platform: 'node',
      clean: ['dist/main*'],
      deps: { neverBundle: ['electron'] },
    },
    {
      // 渲染层: sandbox 下没有模块加载器, 把 /web 入口一起打成单文件
      name: 'playground-renderer',
      entry: { renderer: 'src/renderer.ts' },
      format: 'iife',
      platform: 'browser',
      clean: ['dist/renderer*'],
      deps: { alwaysBundle: [/^@quiteer\/electron-ipc/] },
    },
  ],
});
