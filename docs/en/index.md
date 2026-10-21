---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: "electronup"
  text: "A build toolchain for Electron"
  tagline: One config file for the renderer, the main process, preload scripts and installers
  image:
    src: /home.png
    alt: electronup

  actions:
    - theme: brand
      text: Get started
      link: /en/introduce/introduction
    - text: Overview
      link: /en/introduce/project
    - theme: alt
      text: GitHub
      link: https://github.com/QuiteerJs/electronup

features:
  - icon: ⚡️
    title: Two-process development
    details: The renderer uses Vite HMR; vite-plus pack watches the main process and restarts Electron automatically.
  - icon: 🦾
    title: One build pipeline
    details: Built on vite-plus and electron-builder. The renderer, main process and preload scripts are built together.
  - icon: 🎯
    title: Platform aware
    details: Builds the current OS and architecture by default, or choose a platform and architectures via CLI flags or an interactive wizard.
  - icon: 🧩
    title: Presets you can override
    details: Sane defaults for paths and electron-builder, while keeping the original tool configuration style.
  - icon: 🔧
    title: TypeScript
    details: Main process and preload scripts are built with vite-plus pack. The config file is TypeScript too.
  - icon: 📦
    title: Auto update
    details: Ships electron-updater helpers for initialization and update checks, working with electron-builder publish config.
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
