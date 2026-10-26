---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: "electronup"
  text: "为 Electron 准备的构建工具链"
  tagline: 一个配置文件，统管渲染进程、主进程、preload 与安装包
  image:
    src: /home.png
    alt: electronup

  actions:
    - theme: brand
      text: 开始使用
      link: /introduce/introduction
    - text: 项目介绍
      link: /introduce/project
    - theme: alt
      text: GitHub
      link: https://github.com/QuiteerJs/electronup

features:
  - icon: ⚡️
    title: 双进程开发
    details: 渲染进程使用 Vite 热更新，主进程由 Vite 监听构建并自动重启 Electron。
  - icon: 🦾
    title: 一体化打包
    details: 集成 Vite 与 electron-builder，渲染进程、主进程和 preload 一次构建完成。
  - icon: 🎯
    title: 按平台输出
    details: 默认构建当前系统与架构，也可通过命令行或交互式向导选择平台和架构。
  - icon: 🧩
    title: 预置但可覆盖
    details: 内置常用路径与 electron-builder 配置，保留原有构建工具的配置方式。
  - icon: 🔧
    title: TypeScript
    details: 主进程与 preload 同样使用 Vite 构建，配置文件同样使用 TypeScript。
  - icon: 📦
    title: 自动更新
    details: 内置 electron-updater 初始化与检查更新辅助方法，配合 electron-builder 发布配置使用。
---

<style>
:root {
  --vp-home-hero-name-color: transparent;
  --vp-home-hero-name-background: -webkit-linear-gradient(120deg, #bd34fe 30%, #41d1ff);

  --vp-home-hero-image-background-image: linear-gradient(-45deg, #bd34fe 50%, #47caff 50%);
  --vp-home-hero-image-filter: blur(40px);
}

@media (min-width: 640px) {
  :root {
    --vp-home-hero-image-filter: blur(56px);
  }
}

@media (min-width: 960px) {
  :root {
    --vp-home-hero-image-filter: blur(72px);
  }
}
</style>
