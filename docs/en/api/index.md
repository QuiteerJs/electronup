---
title: API
---

# {{ $frontmatter.title }}

The `electronup` package exports:

| Export | Type | Description |
| --- | --- | --- |
| `defineConfig` | function | Config type helper |
| `initAutoUpdater` | function | Initializes electron-updater |
| `checkForUpdates` | function | Checks for updates |
| `autoUpdater` | instance | Raw electron-updater instance |
| `BuilderConfig` | type | Alias for electron-builder config |
| `ConfigEnv` | type | Argument type of the config function |
| `ElectronupConfig` | type | Full config type |
| `PackConfig` | type | Type of `packConfig` |
| `ViteConfig` | type | Type of `viteConfig` |
| `AutoUpdaterOptions` | type | Options of `initAutoUpdater` |

## `defineConfig`

> A typing helper that returns the config unchanged.

```ts
import { defineConfig } from 'electronup'

export default defineConfig({
  // ...
})
```

Even without `"type": "module"` in `package.json`, ESM syntax works in the config file.

### Conditional config

Pass a function when the config depends on the command (`serve` / `build`) or the project root:

```ts
import { defineConfig } from 'electronup'

export default defineConfig(({ command, root }) => {
  if (command === 'serve') {
    return {
      // dev-only options
    }
  }

  return {
    // build-only options
  }
})
```

`command` is `'serve'` or `'build'`; `root` is the project root where the CLI was started.

### Async config

Return a promise or use an async function:

```ts
export default defineConfig(async () => {
  const data = await loadConfig()
  return {
    // config
  }
})
```

::: tip
`ConfigEnv` only contains `command` and `root`; there is no `mode`. Load environment variables yourself if needed.
:::

### `ConfigEnv`

```ts
interface ConfigEnv {
  command: 'build' | 'serve'
  root: string
}
```

## `initAutoUpdater`

> Configures the electron-updater instance and optionally checks for updates on start.

```ts
import { initAutoUpdater } from 'electronup'

initAutoUpdater({
  checkOnStart: true,
  autoDownload: true,
  autoInstallOnAppQuit: true,
  logger: undefined,
})
```

`AutoUpdaterOptions`:

```ts
interface AutoUpdaterOptions {
  /** Check right after init. Defaults to true. */
  checkOnStart?: boolean
  /** Download automatically once found. Defaults to true. */
  autoDownload?: boolean
  /** Install a downloaded update on quit. Defaults to true. */
  autoInstallOnAppQuit?: boolean
  /** Logger compatible with electron-updater. */
  logger?: typeof autoUpdater.logger
}
```

Returns the `autoUpdater` instance. Call it after `app.whenReady()`. The start-up check only fires when `app.isPackaged` is `true`.

## `checkForUpdates`

> Checks for updates and downloads according to the current configuration.

```ts
import { checkForUpdates } from 'electronup'

const result = await checkForUpdates()
```

When `app.isPackaged === false`, it resolves to `null` without a network request.

## `autoUpdater`

The raw electron-updater instance for events and fine-grained control:

```ts
import { autoUpdater } from 'electronup'

autoUpdater.on('update-available', (info) => {})
autoUpdater.on('update-downloaded', (info) => {})
autoUpdater.on('error', (error) => {})
```

See the [electron-updater docs](https://www.electron.build/auto-update) for events and fields.

## Config types

```ts
import type {
  AutoUpdaterOptions,
  BuilderConfig,
  ConfigEnv,
  ElectronupConfig,
  PackConfig,
  ViteConfig,
} from 'electronup'
```

See [Configuration](/en/introduce/config) for every field and default.
