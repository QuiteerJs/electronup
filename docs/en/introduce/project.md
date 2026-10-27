---
title: Overview
---

# {{ $frontmatter.title }}

## What is electronup?

[electronup](https://github.com/QuiteerJs/electronup) is a command-line build tool for Electron applications. It wires the renderer, the main process, preload scripts and installer packaging into a single workflow:

- The renderer is built and hot-reloaded by **Vite**.
- The main process is built and watched by **Vite** in SSR (Node) mode.
- Preload scripts are built with Vite as well.
- Installers are produced by **electron-builder**.

You only need to maintain one `electronup.config.ts` file in the project root. Most common options of the underlying tools are preset, and most presets can be overridden.

::: warning TypeScript only
The main process and preload scripts are built with Vite, and the main entry is fixed to `${mainDir}/index.ts`. JavaScript main entries are not supported in the current version. The config file is meant to be `electronup.config.ts` as well.
:::

## What it does

| Capability | Description |
| --- | --- |
| Dev server | Starts a Vite dev server, watches the main process and launches / restarts Electron after a successful build |
| Build | Builds the renderer, preload scripts and main process, then calls electron-builder |
| Path conventions | Manages `render`, `main`, `public`, `lib`, resource output and installer output |
| Environment variables | Loads `.env` and `.env.{mode}` from the project root, injects them into the main process and preload scripts; `VITE_`-prefixed variables are available in the renderer |
| Platform selection | Defaults to the current platform and architecture, with CLI flags and an interactive wizard |
| Update helpers | Exports `initAutoUpdater`, `checkForUpdates` and `autoUpdater` to simplify electron-updater integration |

## What it does not do

To avoid confusion:

- **It does not install or pin Electron.** `electron` is an optional peer dependency installed and versioned by your app. electronup reads the installed version when building.
- **It does not provide runtime helpers for windows, menus, trays or IPC.** Those live in the [electron-modules](https://github.com/QuiteerJs/electron-modules) packages. See the [plugin overview](/en/plugins/).
- **It does not replace the full documentation of Vite or electron-builder.** electronup presets and orchestrates them; refer to their docs for uncovered options.
- **It does not manage code signing certificates.** macOS notarization and Windows code signing still depend on electron-builder configuration and your certificate setup; see [Code signing and notarization](/en/introduce/config#code-signing-and-notarization).

## Requirements

| Dependency | Requirement |
| --- | --- |
| Node.js | `^22.18.0 \|\| ^24.11.0 \|\| >=26.0.0` (see `engines` in `packages/electronup/package.json`) |
| Package manager | npm, yarn or pnpm |
| Electron | `>= 28` recommended; installed by your app |
| TypeScript | Main and preload entries must be TypeScript |
| Git | Only needed when `create-electronup` pulls a remote template |

## Installation

```bash
npm install electronup -D
```

```bash
yarn add electronup -D
```

```bash
pnpm add electronup -D
```

`electronup` already depends on `vite`, `electron-builder` and friends. Your app usually only needs `electron` and `typescript`:

```json
{
  "devDependencies": {
    "electron": "^40.6.1",
    "electronup": "^0.3.0",
    "typescript": "^5.9.3"
  }
}
```

## Features

- **Multiple templates**: `create-electronup` supports `vanilla`, `vue`, `react`, `react-swc` and `solid`.
- **Two-process dev experience**: renderer HMR; main process rebuilds and restarts Electron on change.
- **Unified environment variables**: `.env` / `.env.{mode}` are loaded with dotenv and injected into the main process and preload scripts; the renderer can use `VITE_`-prefixed variables.
- **Single-file config**: `electronup.config.ts` manages paths, Vite, pack, preload scripts and electron-builder.
- **Platform aware**: builds for the current OS and architecture by default; Windows / macOS / Linux and their architectures can be selected explicitly.
- **Overridable presets**: paths, `viteConfig`, `packConfig` and `builderConfig` follow documented merge rules.
- **Inspectable output**: `electronup-effective-config.yaml` is written to the output directory after each build.

## Related packages

| Package | Purpose |
| --- | --- |
| [`electronup`](https://www.npmjs.com/package/electronup) | The CLI and config API documented here |
| [`create-electronup`](https://www.npmjs.com/package/create-electronup) | Creates a project from a remote template |
| [`@quiteer/parser-config`](https://www.npmjs.com/package/@quiteer/parser-config) | Parses `electronup.config.ts` and other config files |
| [electron-modules](https://github.com/QuiteerJs/electron-modules) | Optional runtime packages for windows, menus, trays, IPC and preload |

## Platform limitations

These limitations come from electron-builder or the current implementation:

- macOS installers can only be built on macOS.
- Linux packages cannot be built on Windows.
- The interactive wizard does not offer Windows when running on Linux. The non-interactive CLI does not block `--win` on Linux, but success depends on the host toolchain (for example Wine).
- Only one platform is built per run. Run the build multiple times for multiple platforms.

See the [CLI reference](/en/introduce/cli) for all flags and [Configuration](/en/introduce/config) for details.

<div style="display:flex;align-items:center;gap:12px;margin-top:32px">
  <img src="/group.jpg" style="height:40px;border-radius:8px" alt="Electron community group" />
  <span>Electron community group (Chinese): 12354891</span>
</div>
