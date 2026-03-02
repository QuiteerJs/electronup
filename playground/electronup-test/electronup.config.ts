import Vue from '@vitejs/plugin-vue'
import VueJsx from '@vitejs/plugin-vue-jsx'
import { defineConfig } from 'electronup'

export default defineConfig((env) => {
  console.log('defineConfig env: ', env)
  return {
    viteConfig: {
      plugins: [Vue(), VueJsx({})],
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
