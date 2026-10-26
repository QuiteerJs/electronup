---
title: Auto update
---

# {{ $frontmatter.title }}

electronup bundles [electron-updater](https://www.electron.build/auto-update) and exports three helpers:

| Export | Description |
| --- | --- |
| `initAutoUpdater(options?)` | Configures electron-updater and optionally checks for updates on start |
| `checkForUpdates()` | Manually checks for updates; returns `null` when not packaged |
| `autoUpdater` | A lazy proxy to the electron-updater instance for events and finer control |

## Basic usage

Initialize after `app.whenReady()` in the main process:

```ts
import { autoUpdater, initAutoUpdater } from 'electronup'
import { app } from 'electron'

void app.whenReady().then(() => {
  // Subscribe before the startup check so early errors are observable
  autoUpdater.on('error', error => console.error('Update failed:', error))
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

`initAutoUpdater` returns the underlying instance. The exported `autoUpdater` is a lazy proxy to that instance, so they are different objects. Subscribe through the proxy before initialization:

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
- Linux: `AppImage`, `rpm` or `deb` artifacts. electron-builder's default Linux targets include `snap` (not supported by electron-updater, and it needs snapcraft to build), so set `linux: { target: ['AppImage'] }` explicitly.

## Behavior in development

- When `app.isPackaged` is `false`, neither `initAutoUpdater` nor `checkForUpdates` performs a network request.
- `initAutoUpdater` handles rejection of the startup check Promise. The electron-updater `error` event and logger can still report failures. Manual `checkForUpdates` calls reject normally and need your own error handling.
- `autoUpdater` is a lazy proxy: accessing its properties initializes electron-updater, so merely importing `electronup` in a non-Electron process (for example while loading `electronup.config.ts` during a build) does not trigger initialization. Calling initialization or accessing the proxy still requires the Electron main process.
- electronup ships no update UI. Listen to `autoUpdater` events and build your own prompts.

## Repository example and upgrade verification

`playground/electronup-test` includes the production dependency, `noExternal` configuration, the Linux `AppImage` target, and main-process event listeners. Set `ELECTRONUP_UPDATE_URL` at build time to configure a generic update source. Without it, publishing configuration is disabled and the example does not check automatically. The example enables startup checks only when the packager has generated `app-update.yml`.

CI runs two builds on each of the three platforms:

| Platform | Build command | Update metadata |
| --- | --- | --- |
| Windows | `build --win x64` (NSIS) | `latest.yml` |
| macOS | `build --mac` (dmg + zip, unsigned) | `latest-mac.yml` |
| Linux | `build --linux x64` (AppImage) | `latest-linux.yml` |

The `--dir` build checks updater dependencies inside the unpacked app (`electron-updater` is a production dependency, lives inside the app, and the update helpers are inlined into the main process). The installer build from the table then checks the provider and URL in `app-update.yml`, and verifies the version plus each installer's size and SHA-512 hash in the metadata. Windows/macOS `--dir` builds do not generate update configuration; a successful directory build does not establish that upgrading works.

To verify a real upgrade on Windows, run these PowerShell commands from the repository root:

```powershell
pnpm --filter electronup build
$env:ELECTRONUP_UPDATE_URL = 'http://127.0.0.1:18080/'
$env:ELECTRONUP_UPDATE_VERSION = '1.0.0'
pnpm --filter electronup-test exec node ../../packages/electronup/dist/bin/electronup.mjs build --win x64
```

Install the generated `1.0.0` NSIS installer, then quit the app. Build the next version:

```powershell
$env:ELECTRONUP_UPDATE_VERSION = '1.0.1'
pnpm --filter electronup-test exec node ../../packages/electronup/dist/bin/electronup.mjs build --win x64
# Requires Python 3; serve the new installer, blockmap and latest.yml in a separate terminal
python -m http.server 18080 --bind 127.0.0.1 --directory playground/electronup-test/dist/out
```

Launch the installed old version, verify detection and download of `1.0.1`, quit to install, then relaunch and confirm `app.getVersion()` is `1.0.1`. Also verify that the same version does not update and that a stopped server produces an error while the app remains usable. The version environment variable only overrides verification artifacts; it does not change repository versions. Remove both environment variables after verification.

The local HTTP address is for verification on the same machine. Production apps should use their actual HTTPS update source and verify platform signing, installation permissions, and access to update files. CI does not currently install, restart, or upgrade between versions; those steps still require verification on the target system.
