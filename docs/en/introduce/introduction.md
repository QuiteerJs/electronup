---
title: Getting started
---

# {{ $frontmatter.title }}

This chapter walks you through creating a project and running the electronup dev and build workflows.

## Requirements

::: tip Prerequisites
- Node.js `^22.18.0 || ^24.11.0 || >=26.0.0` (matching vite-plus)
- npm, yarn or pnpm
- Network access to GitHub when using the templates
:::

## Create a project

With npm:

```bash
npm create electronup@latest
```

With yarn:

```bash
yarn create electronup
```

With pnpm:

```bash
pnpm create electronup
```

This installs and runs [create-electronup](https://github.com/QuiteerJs/electronup/tree/main/packages/create-electronup). Answer the prompts to pick a project name and a framework.

You can also pass the project name and template directly:

```bash
pnpm create electronup my-app --template vue
```

### Available templates

| Template | Description |
| --- | --- |
| `vanilla` | Vanilla TypeScript + Vite |
| `vue` | Vue 3 |
| `react` | React + TypeScript |
| `react-swc` | React + TypeScript + SWC |
| `solid` | Solid |

When you choose `react`, the CLI asks whether to use plain TypeScript or the SWC variant.

::: tip Template source
Templates are not bundled with the CLI. They are fetched with [giget](https://github.com/unjs/giget) from the matching branch of [electronup-template](https://github.com/QuiteerJs/electronup-template), so GitHub access is required; use `--mirror` when GitHub is hard to reach.
:::

### Create in the current directory

Use `.` as the project name to scaffold into the current directory:

```text
? Project name: »
```

If the directory is not empty, the CLI asks before clearing it (`.git` is kept).

## Install dependencies

```bash
pnpm install
```

Or with npm / yarn:

```bash
npm install
```

```bash
yarn install
```

Templates default to pnpm, but other package managers work too.

## Common scripts

A template `package.json` usually contains:

```json
{
  "scripts": {
    "dev": "electronup --no-minify",
    "build": "electronup build",
    "dir": "electronup build --dir --no-asar --no-minify",
    "postinstall": "electron-builder install-app-deps"
  }
}
```

- `dev`: starts the dev environment. dev never minifies, so `--no-minify` can be dropped.
- `build`: builds an installer for the current platform.
- `dir`: produces an unpacked directory for quick verification.
- `postinstall`: rebuilds native dependencies. Remove it if the project has none.

## First run

```bash
pnpm dev
```

electronup will:

1. Read `electronup.config.ts`.
2. Start the Vite dev server (port `8090` by default, falling back to the next free port).
3. Build preload scripts and the main process.
4. Launch the project's Electron and open the window.

Renderer changes use Vite HMR. Main process changes trigger a rebuild and restart Electron. Preload changes are rebuilt and restart Electron as well.

## Build

```bash
pnpm build
```

This builds for the current OS and architecture. To pick a platform or architecture:

```bash
electronup build --win x64
electronup build --mac arm64
electronup build --linux x64
```

Or use the interactive wizard:

```bash
electronup build -o
```

Installers end up in `dist/out` (configurable with `outDir`); intermediate output goes to `dist/resource` (configurable with `resourceDir`).

## Add electronup to an existing project

Install the toolchain manually:

```bash
pnpm add -D electronup electron typescript
```

Minimal structure:

```text
my-app/
├── main/
│   └── index.ts
├── render/
│   └── index.html
├── electronup.config.ts
├── package.json
└── tsconfig.json
```

`electronup.config.ts`:

```ts
import { defineConfig } from 'electronup'

export default defineConfig({})
```

`main/index.ts` must load a different URL in development and production:

```ts
import { resolve } from 'node:path'
import { app, BrowserWindow } from 'electron'

const url = process.env.NODE_ENV === 'development'
  ? `http://localhost:${process.env.RENDER_PORT}`
  : `file://${resolve(__dirname, 'index.html')}`

void app.whenReady().then(() => {
  const win = new BrowserWindow()
  void win.loadURL(url)
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin')
    app.quit()
})
```

Add scripts to `package.json`:

```json
{
  "main": "dist/resource/electron.cjs",
  "scripts": {
    "dev": "electronup --no-minify",
    "build": "electronup build"
  }
}
```

In the current version the main process output is `electron.cjs`. When packaging, electron-builder generates the app entry from the actual output; during development electronup starts the built main file directly.

## Next steps

- Learn the directory conventions: [Project structure](/en/introduce/catalogue)
- See every CLI flag: [CLI](/en/introduce/cli)
- Configure Vite and electron-builder: [Configuration](/en/introduce/config)
