import { defineConfig } from 'electronup'
import vue from '@vitejs/plugin-vue'
import react from '@vitejs/plugin-react'
import { defineConfig as viteConfig } from 'vite'

export default defineConfig(Promise.resolve({
  viteConfig: {
    plugins: [vue(), react()]
  },
  tsupConfig: {
    external: ['electron']
  },
  builderConfig: {}
}))

viteConfig(Promise.resolve({
  plugins: [vue(), react()]
}))
