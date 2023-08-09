import { type ConfigEnv, type ElectronupConfig, defineConfig } from 'electronup'
import vue from '@vitejs/plugin-vue'
import react from '@vitejs/plugin-react'

export default defineConfig((env: ConfigEnv) => {
  // eslint-disable-next-line no-console
  console.log('env: ', env)
  const options: ElectronupConfig = {
    viteConfig: {
      plugins: [vue(), react()]
    },
    tsupConfig: {
      external: ['electron']
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

  return options
})
