import process from 'node:process'
import { defineConfig } from 'vitepress'
import { version } from '../../packages/electronup/package.json'

// Vercel 会注入 VERCEL 环境变量，GitHub Pages 使用仓库子路径
const isVercel = Boolean(process.env.VERCEL)
const base = isVercel ? '/' : '/electronup/'

const repo = 'https://github.com/QuiteerJs/electronup'

export default defineConfig({
  base,
  lang: 'zh-CN',
  title: 'electronup 中文文档',
  description: '融合 Vite 与 electron-builder 的 Electron 构建工具',
  head: [['link', { rel: 'icon', href: `${base}favicon.ico` }]],
  markdown: {
    lineNumbers: true,
  },
  lastUpdated: true,
  appearance: true,
  themeConfig: {
    siteTitle: 'electronup',
    logo: '/favicon.ico',
    socialLinks: [{ icon: 'github', link: repo }],
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2023-present 安静',
    },
    editLink: {
      pattern: `${repo}/edit/main/docs/:path`,
      text: '在 GitHub 编辑此页',
    },
    lastUpdated: { text: '最后更新时间', formatOptions: { dateStyle: 'long', timeStyle: 'short', forceLocale: true } },
    docFooter: {
      prev: '上一页',
      next: '下一页',
    },
    outline: {
      level: [2, 3],
      label: '本页目录',
    },
    darkModeSwitchLabel: '深色模式',
    lightModeSwitchTitle: '浅色模式',
    returnToTopLabel: '返回顶部',
    sidebarMenuLabel: '菜单',
    langMenuLabel: '切换语言',
    nav: zhNav(),
    sidebar: sidebar(''),
  },
  locales: {
    root: {
      label: '简体中文',
      lang: 'zh-CN',
      title: 'electronup 中文文档',
      description: '融合 Vite 与 electron-builder 的 Electron 构建工具',
    },
    en: {
      label: 'English',
      lang: 'en-US',
      link: '/en/',
      title: 'electronup Documentation',
      description: 'An Electron build tool that combines Vite and electron-builder',
      themeConfig: {
        siteTitle: 'electronup',
        editLink: {
          pattern: `${repo}/edit/main/docs/:path`,
          text: 'Edit this page on GitHub',
        },
        lastUpdated: { text: 'Last updated', formatOptions: { dateStyle: 'long', timeStyle: 'short', forceLocale: true } },
        docFooter: {
          prev: 'Previous page',
          next: 'Next page',
        },
        outline: {
          level: [2, 3],
          label: 'On this page',
        },
        darkModeSwitchLabel: 'Dark mode',
        lightModeSwitchTitle: 'Light mode',
        returnToTopLabel: 'Return to top',
        sidebarMenuLabel: 'Menu',
        langMenuLabel: 'Change language',
        nav: enNav(),
        sidebar: sidebar('/en'),
      },
    },
  },
})

function zhNav() {
  return [
    {
      text: '指引',
      link: '/introduce/project',
      activeMatch: '/introduce/',
    },
    {
      text: '插件',
      link: '/plugins/',
      activeMatch: '/plugins/',
    },
    {
      text: 'API',
      link: '/api/',
      activeMatch: '/api/',
    },
    {
      text: '关于',
      link: '/about/',
      activeMatch: '/about/',
    },
    {
      text: '相关文档',
      items: [
        { text: 'electron', link: 'https://www.electronjs.org/zh/' },
        { text: 'vite', link: 'https://cn.vitejs.dev/' },
        { text: 'electron-builder', link: 'https://www.electron.build/' },
      ],
    },
    {
      text: version,
      items: [
        { text: '0.1.x 文档', link: 'https://electronup-git-1x-quiteer.vercel.app/' },
        { text: 'GitHub 组织', link: 'https://github.com/QuiteerJs' },
        { text: '友情链接 / sky', link: 'https://umbrella22.github.io/electron-vue-template-doc/' },
      ],
    },
  ]
}

function enNav() {
  return [
    {
      text: 'Guide',
      link: '/en/introduce/project',
      activeMatch: '/en/introduce/',
    },
    {
      text: 'Plugins',
      link: '/en/plugins/',
      activeMatch: '/en/plugins/',
    },
    {
      text: 'API',
      link: '/en/api/',
      activeMatch: '/en/api/',
    },
    {
      text: 'About',
      link: '/en/about/',
      activeMatch: '/en/about/',
    },
    {
      text: 'Resources',
      items: [
        { text: 'electron', link: 'https://www.electronjs.org/' },
        { text: 'vite', link: 'https://vite.dev/' },
        { text: 'electron-builder', link: 'https://www.electron.build/' },
      ],
    },
    {
      text: version,
      items: [
        { text: '0.1.x docs', link: 'https://electronup-git-1x-quiteer.vercel.app/' },
        { text: 'GitHub organization', link: 'https://github.com/QuiteerJs' },
      ],
    },
  ]
}

function sidebar(prefix: '' | '/en') {
  const common = [
    {
      text: prefix ? 'Guide' : '介绍',
      items: [
        { text: prefix ? 'Overview' : '项目介绍', link: `${prefix}/introduce/project` },
        { text: prefix ? 'Getting started' : '快速上手', link: `${prefix}/introduce/introduction` },
        { text: prefix ? 'Project structure' : '目录介绍', link: `${prefix}/introduce/catalogue` },
        { text: prefix ? 'CLI' : '命令行界面', link: `${prefix}/introduce/cli` },
        { text: prefix ? 'Configuration' : '配置', link: `${prefix}/introduce/config` },
        { text: prefix ? 'Auto update' : '自动更新', link: `${prefix}/introduce/auto-update` },
      ],
    },
    {
      text: prefix ? 'Plugins' : '插件',
      items: [
        { text: prefix ? 'Plugin overview' : '插件总览', link: `${prefix}/plugins/` },
        { text: 'parser-config', link: `${prefix}/plugins/parser-config` },
        { text: 'create-electronup', link: `${prefix}/plugins/create-electronup` },
        { text: 'electron-ipc', link: `${prefix}/plugins/electron-ipc` },
        { text: 'electron-preload', link: `${prefix}/plugins/electron-preload` },
        { text: 'electron-browser', link: `${prefix}/plugins/electron-browser` },
        { text: 'electron-menu', link: `${prefix}/plugins/electron-menu` },
        { text: 'electron-tray', link: `${prefix}/plugins/electron-tray` },
        { text: 'electron-app', link: `${prefix}/plugins/electron-app` },
        { text: 'electron-shortcut', link: `${prefix}/plugins/electron-shortcut` },
        { text: prefix ? 'Migration guide' : '升级指南', link: `${prefix}/plugins/migration` },
      ],
    },
    {
      text: 'API',
      items: [{ text: prefix ? 'API reference' : 'API', link: `${prefix}/api/` }],
    },
  ]

  return {
    [`${prefix}/introduce/`]: common,
    [`${prefix}/plugins/`]: common,
    [`${prefix}/api/`]: common,
    [`${prefix}/about/`]: [
      {
        text: prefix ? 'About' : '关于',
        items: [{ text: prefix ? 'About this site' : '关于本文档', link: `${prefix}/about/` }],
      },
    ],
  }
}
