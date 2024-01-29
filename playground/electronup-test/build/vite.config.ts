import type { ViteConfig } from 'electronup'
import VueMacros from 'unplugin-vue-macros/vite'
import Vue from '@vitejs/plugin-vue'
import VueJsx from '@vitejs/plugin-vue-jsx'

/**
 * 框架内置的配置
 * 无需重复配置
 * 在此列出
 */
//  {
//   base: './',
//   root: 'render',
//   publicDir: 'public',
//   server: { host: '0.0.0.0' },
//   plugins: [
//      自行导入插件
//   ],
// ...config.viteOptions,
//   build: {
//     outDir: 'dist',
//     target: 'esnext',
//     minify: 'esbuild',
//     reportCompressedSize: false,
//     emptyOutDir: false,
//     chunkSizeWarningLimit: 2000
//   },
// 额外的vite配置
//   viteOptions: {}
// }

export default {
  plugins: [VueMacros({
    plugins: {
      vue: Vue(),
      vueJsx: VueJsx()
    }
  })]
} as ViteConfig
