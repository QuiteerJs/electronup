import { defineConfig } from 'electronup'
import VueMacros from 'unplugin-vue-macros/vite'
import Vue from '@vitejs/plugin-vue'
import VueJsx from '@vitejs/plugin-vue-jsx'

export default defineConfig((env) => {
  console.log('defineConfig env: ', env)
  return {
    viteConfig: {
      plugins: [VueMacros({
        plugins: {
          vue: Vue(),
          vueJsx: VueJsx()
        }
      })]
    },
    builderConfig: {
      asar: false
    }
  }
})
