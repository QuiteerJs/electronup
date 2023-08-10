import { defineConfig } from 'electronup'
import vue from '@vitejs/plugin-vue'
import react from '@vitejs/plugin-react'

defineConfig({
  viteConfig: {
    resolve: {
      alias: {
        '@': 'src'
      }
    },
    build: {
      reportCompressedSize: false
    },
    plugins: [vue(), react()]
  },
  tsupConfig: {
    external: ['electron']
  },
  builderConfig: {}
})

defineConfig(Promise.resolve({
  viteConfig: {
    plugins: [vue(), react()]
  },
  tsupConfig: {
    external: ['electron']
  },
  builderConfig: {}
}))

defineConfig(() => ({
  viteConfig: {
    plugins: [vue(), react()]
  },
  tsupConfig: {
    external: ['electron']
  },
  builderConfig: {}
}))

defineConfig(() => Promise.resolve({
  viteConfig: {
    plugins: [vue(), react()]
  },
  tsupConfig: {
    external: ['electron']
  },
  builderConfig: {}
}))

defineConfig(async (env) => {
  return {
    viteConfig: {
    },
    tsupConfig: {
      external: ['electron']
    },
    builderConfig: {}
  }
})

