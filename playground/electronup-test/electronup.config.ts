/* oxlint-disable no-console */
import Vue from '@vitejs/plugin-vue'
import VueJsx from '@vitejs/plugin-vue-jsx'
import { resolve } from 'node:path'
import { defineConfig } from 'electronup'

export default defineConfig((env) => {
  console.log('defineConfig env: ', env)
  return {
    viteConfig: {
      plugins: [Vue(), VueJsx({})],
    },
    preload: {
      entry: { preload: resolve(__dirname, 'preload/index.ts') },
    },
    builderConfig: {
      asar: false,
      mac: {
        target: [
          {
            target: 'dmg',
          },
        ],
      },
    },
  }
})
