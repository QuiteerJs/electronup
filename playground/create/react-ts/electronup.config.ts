import { resolve } from 'path'
import type { ConfigEnv } from 'electronup'
import { defineConfig } from 'electronup'
import react from '@vitejs/plugin-react'

export default defineConfig((env: ConfigEnv) => {
  const srcDir = resolve(env.root, 'render')
  return {
    viteConfig: {
      resolve: { alias: { '@': srcDir } }, plugins: [react()]
    },
    builderConfig: {
      win: {
        icon: 'public/icon.png',
        target: {
          target: 'nsis',
          arch: 'ia32'
        }
      }
    }
  }
})
