---
title: 关于本文档
---

# {{ $frontmatter.title }}

本文档使用 [VitePress](https://vitepress.dev/) 构建，源码位于仓库的 `docs` 目录。

## 中英文档

站点提供两个语言版本：

| 语言 | 地址 |
| --- | --- |
| 简体中文（默认） | `/` |
| English | `/en/` |

两个版本的内容保持同步。新增文档时，请在 `docs/` 与 `docs/en/` 下同时添加对应文件，并在 `docs/.vitepress/config.ts` 的导航与侧边栏中注册。

## 本地预览

```bash
pnpm install
pnpm docs:dev
```

构建静态站点：

```bash
pnpm docs:build
pnpm docs:serve
```

## 文档配置

导航、侧边栏、多语言与主题文案都在 `docs/.vitepress/config.ts` 中配置：

```ts
import process from 'node:process'
import { defineConfig } from 'vitepress'

const isVercel = Boolean(process.env.VERCEL)

export default defineConfig({
  base: isVercel ? '/' : '/electronup/',
  // ...
})
```

部署在 GitHub Pages 时使用 `/electronup/` 作为基础路径；Vercel 环境下自动切换为根路径。
