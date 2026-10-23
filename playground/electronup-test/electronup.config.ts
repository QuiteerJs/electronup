/* oxlint-disable no-console */
import Vue from '@vitejs/plugin-vue'
import VueJsx from '@vitejs/plugin-vue-jsx'
import { resolve } from 'node:path'
import process from 'node:process'
import { defineConfig } from 'electronup'

export default defineConfig((env) => {
  const updateUrl = process.env.ELECTRONUP_UPDATE_URL
  const updateVersion = process.env.ELECTRONUP_UPDATE_VERSION
  console.log('defineConfig env: ', env)
  return {
    viteConfig: {
      plugins: [Vue(), VueJsx({})],
    },
    packConfig: {
      noExternal: ['electronup'],
    },
    preload: {
      entry: { preload: resolve(__dirname, 'preload/index.ts') },
    },
    builderConfig: {
      asar: false,
      // 仅在显式指定更新源时生成更新配置 , 避免普通示例请求占位地址
      publish: updateUrl ? { provider: 'generic' as const, url: updateUrl } : null,
      // 仅覆盖验收安装包的版本 , 不修改仓库 package.json
      ...(updateVersion ? { extraMetadata: { version: updateVersion } } : {}),
    },
  }
})
