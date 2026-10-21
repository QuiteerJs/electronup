---
title: About this site
---

# {{ $frontmatter.title }}

This documentation is built with [VitePress](https://vitepress.dev/). The source lives in the `docs` directory of the repository.

## Languages

The site ships two languages:

| Language | URL |
| --- | --- |
| Simplified Chinese (default) | `/` |
| English | `/en/` |

The two versions are kept in sync. When adding a page, create it under both `docs/` and `docs/en/` and register it in the nav and sidebar in `docs/.vitepress/config.ts`.

## Local preview

```bash
pnpm install
pnpm docs:dev
```

Build the static site:

```bash
pnpm docs:build
pnpm docs:serve
```

## Site configuration

Navigation, sidebars, locales and theme texts are configured in `docs/.vitepress/config.ts`:

```ts
import process from 'node:process'
import { defineConfig } from 'vitepress'

const isVercel = Boolean(process.env.VERCEL)

export default defineConfig({
  base: isVercel ? '/' : '/electronup/',
  // ...
})
```

GitHub Pages uses `/electronup/` as the base path; Vercel switches to the root path automatically.
