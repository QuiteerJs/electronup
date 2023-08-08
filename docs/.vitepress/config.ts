import { defineConfig } from 'vitepress'
import { version } from '../../packages/electronup/package.json'

export default defineConfig({
  title: 'electronup中文文档',
  description: 'electron 的构建所需',
  base: '/electronup/',
  lang: 'en',
  head: [['link', { rel: 'icon', href: 'favicon.ico' }]],
  markdown: {
    lineNumbers: true
  },
  lastUpdated: true,
  appearance: true,
  themeConfig: {
    siteTitle: 'electronup中文文档',
    logo: '/favicon.ico',
    lastUpdatedText: '最后更新时间',
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2023-08-present 安静'
    },
    docFooter: {
      prev: '上一页',
      next: '下一页'
    },
    nav: nav(),
    socialLinks: [{ icon: 'github', link: 'https://github.com/QuiteerJs' }],
    sidebar: {
      '/about/': [
        {
          text: '关于',
          items: [{ text: '文档配置', link: '/about/' }]
        }
      ],
      ...introduceSidebar()
    }
  }
})

function nav() {
  return [
    {
      text: '指引',
      link: '/introduce/project',
      activeMatch: '/introduce|main|renderer|config|builder/'
    },
    {
      text: '关于',
      link: '/about/',
      activeMatch: '/about/'
    },
    {
      text: '相关文档',
      items: [
        {
          text: 'electron',
          link: 'https://www.electronjs.org/'
        },
        {
          text: 'vite',
          link: 'https://cn.vitejs.dev/'
        },
        {
          text: 'tsup',
          link: 'https://tsup.egoist.dev/'
        },
        {
          text: 'electron-builder',
          link: 'https://www.electron.build/'
        }
      ]
    },
    {
      text: version,
      items: [
        {
          text: '文档仓库地址',
          link: 'https://github.com/QuiteerJs/docs'
        },
        {
          text: '友情连接/sky',
          link: 'https://zh-sky.gitee.io/electron-vue-template-doc/'
        }
      ]
    }
  ]
}

function introduceSidebar() {
  const commonRoute = [
    {
      text: '介绍',
      items: [
        { text: '项目介绍', link: '/introduce/project' },
        { text: '快速上手', link: '/introduce/introduction' },
        { text: '目录', link: '/introduce/catalogue' },
        { text: '命令行界面', link: '/introduce/cli' },
        { text: '配置', link: '/introduce/config' }
      ]
    },
    {
      text: '插件',
      items: [
        { text: '插件总览', link: '/plugins/' },
        { text: 'parser-config', link: '/plugins/parser-config' },
        { text: 'create-electronup', link: '/plugins/create-electronup' },
        { text: 'electron-ipc', link: '/plugins/electron-ipc' },
        { text: 'electron-preload', link: '/plugins/electron-preload' },
        { text: 'electron-browser', link: '/plugins/electron-browser' }
      ]
    },
    {
      text: 'API',
      items: [{ text: 'API', link: '/api/' }]
    }
  ]

  return {
    '/introduce/': commonRoute,
    '/plugins/': commonRoute,
    '/api/': commonRoute
  }
}
