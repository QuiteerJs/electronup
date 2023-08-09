import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import react from '@vitejs/plugin-react'

defineConfig({
  plugins: [vue(), react()]
})

defineConfig(Promise.resolve({
  plugins: [vue(), react()]
}))

defineConfig(() => ({
  plugins: [vue(), react()]
}))

defineConfig(() => Promise.resolve({
  plugins: [vue(), react()]
}))
