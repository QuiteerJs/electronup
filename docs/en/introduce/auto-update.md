---
title: Auto update
---

# {{ $frontmatter.title }}

electronup bundles [electron-updater](https://www.electron.build/auto-update) and exports three helpers:

| Export | Description |
| --- | --- |
| `initAutoUpdater(options?)` | Configures electron-updater and optionally checks for updates on start |
| `checkForUpdates()` | Manually checks for updates; returns `null` when not packaged |
| `autoUpdater` | The raw electron-updater instance for events and finer control |

## Basic usage

Initialize after `app.whenReady()` in the main process:

```ts
import { initAutoUpdater } from 'electronup'
import { app } from 'electron'

void app.whenReady().then(() => {
  initAutoUpdater({
    checkOnStart: true,
    autoDownload: true,
    autoInstallOnAppQuit: true,
  })
})
```

`initAutoUpdater` options:

| Option | Default | Description |
| --- | --- | --- |
| `checkOnStart` | `true` | Check for updates right after initialization; only fires when `app.isPackaged` is `true` |
| `autoDownload` | `true` | Download updates automatically once found |
| `autoInstallOnAppQuit` | `true` | Install a downloaded update when the app quits |
| `logger` | none | A logger compatible with electron-updater |

The return value is the `autoUpdater` instance, so you can keep listening for events:

```ts
import { autoUpdater } from 'electronup'

autoUpdater.on('update-available', (info) => {
  console.log('update available:', info.version)
})

autoUpdater.on('update-downloaded', () => {
  // prompt the user to restart and install
})
```

Manual check:

```ts
import { checkForUpdates } from 'electronup'

// In development this resolves to null without a network request
const result = await checkForUpdates()
```

## Configure an update source

The update source comes from electron-builder's `publish` config, placed in `builderConfig`:

```ts
import { defineConfig } from 'electronup'

export default defineConfig({
  builderConfig: {
    publish: [
      { provider: 'github', owner: 'your-org', repo: 'your-app' },
    ],
  },
})
```

`generic`, `s3`, `spaces` and other electron-builder providers work too. See the [electron-builder publish docs](https://www.electron.build/configuration/publish).

Make sure the packaged output contains the update metadata files (for example `latest.yml`); without them the client cannot check for updates.

## Packaging notes

`electronup` is usually a dev dependency, so the packaged app may not resolve it at runtime. When using the update helpers:

1. Add `electron-updater` to your app `dependencies` so electron-builder ships it:

```bash
pnpm add electron-updater
```

2. Put `electronup` into `packConfig.noExternal` so the helper code is bundled into the main process output:

```ts
export default defineConfig({
  packConfig: {
    noExternal: ['electronup'],
  },
})
```

Both steps are required. The helper code loads `electron-updater` lazily through `createRequire` at runtime, which bundlers cannot follow: even with `electron-updater` in `noExternal`, the output still contains `require("electron-updater")`. So `electron-updater` must be installed as an app `dependency`, otherwise the app fails at runtime with `Cannot find module 'electron-updater'`.

### Platform artifacts

electron-updater expects specific artifact types per platform. Keep them when customizing `builderConfig` targets:

- Windows: NSIS installers (electronup's default `nsis` config); targets such as `portable` do not support auto update.
- macOS: `zip` update packages (`mac.target` includes `zip` by default), and the app must be signed and notarized.
- Linux: `AppImage`, `rpm` or `deb` artifacts.

## Behavior in development

- When `app.isPackaged` is `false`, neither `initAutoUpdater` nor `checkForUpdates` performs a network request.
- The automatic check inside `initAutoUpdater` swallows errors; manual `checkForUpdates` calls reject normally and need your own error handling.
- `autoUpdater` is a lazy instance: electron-updater is only initialized when one of its properties is read, so importing `electronup` in a non-Electron process (for example while loading `electronup.config.ts` during a build) does not trigger initialization.
- electronup ships no update UI. Listen to `autoUpdater` events and build your own prompts.
