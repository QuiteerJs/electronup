# electronup

[![license](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE) ![](https://img.shields.io/github/stars/QuiteerJs/electronup) ![](https://img.shields.io/github/forks/QuiteerJs/electronup)

[简体中文](./README.md) | [English](./README.en.md)

> An Electron build tool that combines Vite, vite-plus pack (vp pack) and electron-builder. One config file for multi-environment, multi-target builds and packaging.

## Documentation

- Chinese docs: https://quiteerjs.github.io/electronup/
- English docs: https://quiteerjs.github.io/electronup/en/

## Features

- **Multiple templates**: `create-electronup` supports `vanilla`, `vue`, `react`, `react-swc` and `solid`.
- **Two-process development**: renderer HMR with Vite; vite-plus pack watches the main process and restarts Electron automatically.
- **Unified environment variables**: `.env` / `.env.{mode}` in the project root are loaded with dotenv for the main process and preload scripts; the renderer can use `VITE_`-prefixed variables.
- **Single-file config**: `electronup.config.ts` manages paths, Vite, pack, preload scripts and electron-builder.
- **Platform aware**: builds the current OS and architecture by default; choose platforms and architectures via CLI flags or an interactive wizard.
- **Overridable presets**: sensible path and electron-builder defaults that keep the original tools' configuration style.
- **Auto update**: exports `initAutoUpdater` / `checkForUpdates` / `autoUpdater`, working with electron-builder publish config.

## Requirements

- Node.js `^22.18.0 || ^24.11.0 || >=26.0.0` (matching vite-plus; this repository uses `24.12.0`)
- Electron `>= 28` (installed by your app)
- TypeScript for the main process and preload entries

## Install

```bash
npm install electronup -D
```

```bash
yarn add electronup -D
```

```bash
pnpm add electronup -D
```

## Create a project

```bash
pnpm create electronup
```

Or add it to an existing project:

```bash
pnpm add -D electronup electron typescript
```

## Usage

```json
{
  "scripts": {
    "dev": "electronup --no-minify",
    "build": "electronup build",
    "dir": "electronup build --dir --no-asar --no-minify"
  }
}
```

```ts
// electronup.config.ts
import { resolve } from 'node:path'
import { defineConfig } from 'electronup'

export default defineConfig({
  preload: {
    entry: { preload: resolve(__dirname, 'preload/index.ts') },
  },
  builderConfig: {
    appId: 'com.example.app',
  },
})
```

See the [configuration docs](https://quiteerjs.github.io/electronup/en/introduce/config) for every option.

## Auto update

```ts
import { initAutoUpdater } from 'electronup'
import { app } from 'electron'

void app.whenReady().then(() => {
  initAutoUpdater({ checkOnStart: true })
})
```

The update source comes from `builderConfig.publish`. See the [auto update docs](https://quiteerjs.github.io/electronup/en/introduce/auto-update).

## Examples

- Playground in this repository: https://github.com/QuiteerJs/electronup/tree/main/playground/electronup-test
- Project templates: https://github.com/QuiteerJs/electronup-template

## Related packages

- [create-electronup](https://github.com/QuiteerJs/electronup/tree/main/packages/create-electronup): creates project templates.
- [@quiteer/parser-config](https://github.com/QuiteerJs/parser-config): resolves config files.
- [electron-modules](https://github.com/QuiteerJs/electron-modules): optional runtime packages for windows, menus, trays, IPC and preload.

## License

[MIT](./LICENSE)
