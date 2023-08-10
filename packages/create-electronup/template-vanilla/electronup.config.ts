import { defineConfig } from 'electronup'

export default defineConfig({
  viteConfig: {  },
  builderConfig: {
    win: {
      icon: 'public/icon.png',
      target: {
        target: 'nsis',
        arch: 'ia32'
      }
    }
  }
})
