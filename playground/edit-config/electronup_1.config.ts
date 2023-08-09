import { defineConfig } from 'electronup'
import vue from '@vitejs/plugin-vue'
import react from '@vitejs/plugin-react'
import { defineConfig as viteConfig } from 'vite'

export default defineConfig({
  viteConfig: {
    plugins: [vue(), react()]
  },
  tsupConfig: {
    external: ['electron']
  },
  builderConfig: {}
})

viteConfig({
  plugins: [vue(), react()]
})
