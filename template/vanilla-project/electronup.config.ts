import { resolve } from 'node:path'
import { defineConfig } from 'electronup'



export default defineConfig((env) => {
  const srcDir = resolve(env.root, 'render')
  return {
    viteConfig: {
      plugins: [],
      resolve: {
        alias: {
          '@': resolve(env.root, 'render')
        }
      }
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
