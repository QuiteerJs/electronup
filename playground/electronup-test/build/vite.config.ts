import type { ViteConfig } from 'electronup'
import Vue from '@vitejs/plugin-vue'
import VueJsx from '@vitejs/plugin-vue-jsx'

export default {
  plugins: [Vue(), VueJsx()],
} as ViteConfig
