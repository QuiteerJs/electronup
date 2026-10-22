---
title: Configuration
---

# {{ $frontmatter.title }}

electronup exports exactly one helper for type hints: [`defineConfig`](/en/api/). It changes no runtime behavior; it only helps you write a correctly typed config.

Create the config file in the project root. A file in another directory can be passed through the CLI.

## Config file

Supported file names (lookup order):

```text
electronup.config.ts
electronup.config.mjs
electronup.config.cjs
electronup.config.js
```

Recommended form:

```ts
// electronup.config.ts
import { defineConfig } from 'electronup'

export default defineConfig({
  // ...
})
```

`defineConfig` also accepts a function or an async function:

```ts
import { defineConfig } from 'electronup'

export default defineConfig(({ command, root }) => {
  return {
    // command is 'serve' (dev) or 'build'
  }
})
```

## Paths

These top-level options decide the input and output directories of each stage:

| Option | Default | Used by |
| --- | --- | --- |
| `renderDir` | `render` | Renderer root, used as Vite `root` |
| `mainDir` | `main` | Main process directory; entry is fixed to `${mainDir}/index.ts` |
| `publicDir` | `public` | Vite `publicDir`, copied as-is |
| `libDir` | `lib` | electron-builder `extraFiles`, copied into the app directory |
| `resourceDir` | `dist/resource` | Renderer, main process and preload output |
| `outDir` | `dist/out` | electron-builder installer output |

```ts
export default defineConfig({
  renderDir: 'render',
  mainDir: 'main',
  publicDir: 'public',
  libDir: 'lib',
  resourceDir: 'dist/resource',
  outDir: 'dist/out',
})
```

::: warning Notes
- Except for `libDir`, these paths are joined with the project root before use.
- `renderDir`, `publicDir` and `mainDir` cannot be overridden inside Vite / vite-plus pack: setting `viteConfig.root`, `viteConfig.publicDir` or `packConfig.entry` has no effect (`packConfig` only exposes `external` / `noExternal`).
- `electronup dev` clears `resourceDir`; `electronup build` clears both `resourceDir` and the packaging output directory (`builderConfig.directories.output` when set, otherwise `outDir`). Never point them at source directories. A safety check runs first: if a directory is the project root or one of its parents, the home directory, a filesystem root, inside `node_modules` / `.git`, or is itself a symlink / junction, electronup exits with an error and deletes nothing.
:::

## Vite

> Renderer build, configured with `viteConfig`.

`viteConfig` is Vite's `UserConfig` (minus `publicDir` and `ssr`). Most Vite options can be passed directly. These are managed by electronup:

| Option | Preset behavior |
| --- | --- |
| `base` | `./` by default, **overridable** |
| `build.minify` | Controlled by `--no-minify`, **not overridable** |
| `build.outDir` | Absolute path of `resourceDir`, **not overridable** |
| `build.modulePreload` | `{ polyfill: false }` by default; can be overridden in `viteConfig.build.modulePreload` |
| `root` | `renderDir`, **not overridable** |
| `publicDir` | Absolute path of `publicDir`, **not overridable** |

Everything else behaves like Vite:

```ts
import Vue from '@vitejs/plugin-vue'
import { defineConfig } from 'electronup'

export default defineConfig({
  viteConfig: {
    plugins: [Vue()],
    build: {
      sourcemap: true,
    },
  },
})
```

::: tip Environment variables
electronup runs dotenv on the project root `.env` and `.env.{mode}` files before starting Vite. `VITE_`-prefixed variables are exposed to the renderer through `import.meta.env`; the main process and preload scripts can read all variables.
:::

## pack

> Main process build, handled by vite-plus pack (`vp pack`) and configured with `packConfig`.

For stability, `packConfig` exposes only two fields:

| Option | Type | Description |
| --- | --- | --- |
| `external` | `(string \| RegExp)[]` | Modules excluded from the bundle; `electron` is always included |
| `noExternal` | `(string \| RegExp)[]` | Modules forced into the bundle |

```ts
export default defineConfig({
  packConfig: {
    external: ['native-module'],
    noExternal: ['some-esm-only-package'],
  },
})
```

Presets:

| Item | Value |
| --- | --- |
| Entry | `${mainDir}/index.ts` (fixed) |
| Output | `resourceDir/electron.cjs` |
| Format | `cjs` (fixed) |
| `dts` | `false` (fixed) |
| `clean` | `false` (fixed) |
| `watch` | `true` in dev, `false` in build |
| `minify` | Follows the CLI; enabled by default |
| `env` | Injects `.env` / `.env.{mode}`, `NODE_ENV` and `RENDER_PORT` |

In dev, a successful main process build launches Electron; changes rebuild and restart it. Changing `format`, `entry` or `outDir` on the pack config has no effect.

::: tip Bundled dependencies
When using the update helpers exported by `electronup`, put `electronup` into `noExternal` so the updater code is bundled into the main process output:

```ts
export default defineConfig({
  packConfig: {
    noExternal: ['electronup'],
  },
})
```
:::

## preload

> Preload build, configured with `preload`. Accepts one config object or an array (multiple entries).

Each item is a vite-plus pack user config and must provide `entry`:

```ts
import { resolve } from 'node:path'
import { defineConfig } from 'electronup'

export default defineConfig({
  preload: {
    entry: { preload: resolve(__dirname, 'preload/index.ts') },
  },
})
```

Per-item defaults are listed below; fields in the item config override them:

| Item | Default |
| --- | --- |
| Format | `cjs`; the output file name follows the entry key (`preload` → `preload.cjs`) |
| Output dir | `resourceDir`; can be set per item with `outDir` |
| Env | Same as the main process; per-item `env` wins |
| `external` | Includes `electron` |
| `dts` / `clean` | `false` |
| `minify` | Follows the CLI |

Both `dev` and `build` build preload scripts before the main process. In dev they are built once and not watched; restart the dev command after editing them.

If your Electron version supports ESM preload, pass `format: 'esm'` in the item to override the default.

## electron-builder

> Installer packaging, configured with `builderConfig`. Only used by `build`.

`builderConfig` is electron-builder's `Configuration`. Presets:

| Option | Preset |
| --- | --- |
| `electronVersion` | Read from the installed `electron` in the project; can be overridden by providing this field in `builderConfig` (it is not part of electron-builder's types, so a type assertion may be needed) |
| `appId` | `com.` + `package.json` `name` (a leading `@` is dropped, invalid characters become `.` with consecutive dots collapsed; a non-ASCII-only name falls back to `com.electronup`) |
| `productName` | `package.json` `name` |
| `nsis` | Non-one-click installer (`oneClick: false`), per-user install (`perMachine: false`), Simplified Chinese, install directory selectable, desktop and start menu shortcuts, etc. |
| `files` | `${resourceDir}/**/*` |
| `extraFiles` | `[libDir]` |
| `directories.output` | Defaults to `outDir`; when `builderConfig.directories.output` is set it wins, and cleanup and `electronup-effective-config.yaml` follow it |
| `asar` | Only written as `false` when `--no-asar` is passed; otherwise electron-builder decides |
| `targets` | Platform and architecture resolved from CLI flags or the interactive wizard |
| `mac.target` | `['dmg', 'zip']`: `dmg` for distributing the installer, `zip` is required by electron-updater on macOS |

Fields in `builderConfig` override the presets, so `appId`, `productName`, `nsis`, `files` and friends can be customized:

```ts
export default defineConfig({
  builderConfig: {
    appId: 'com.example.app',
    productName: 'Example',
    nsis: {
      oneClick: true,
    },
    publish: [
      { provider: 'github', owner: 'your-org', repo: 'your-app' },
    ],
  },
})
```

Platform targets: CLI flags (`--win`, `--mac`, `--linux`, `--dir`) generate electron-builder `targets` and take precedence over the matching target config in `builderConfig`. If your targets are stable, configure `win` / `mac` / `linux` in `builderConfig` and avoid the matching CLI flags.

## Code signing and notarization

electronup presets nothing for signing, so artifacts are unsigned by default; whether they are signed depends on electron-builder configuration and your certificate setup (see "What it does not do" in [Project](/en/introduce/project)).

Because `builderConfig` passes electron-builder's `Configuration` through untouched and your fields override the presets, every signing option is available via `builderConfig`.

> Prerequisite: macOS signing and notarization only run on macOS (electronup already restricts mac builds to macOS); notarization also requires Xcode / command line tools.

### Windows

Prefer environment variables so the certificate never lands in the repo:

- `CSC_LINK`: path or base64 of the `.pfx`.
- `CSC_KEY_PASSWORD`: certificate password.

Or configure it directly:

```ts
export default defineConfig({
  builderConfig: {
    win: {
      certificateFile: 'certs/cert.pfx',
      certificatePassword: process.env.CSC_KEY_PASSWORD,
      signingHashAlgorithms: ['sha256'],
    },
  },
})
```

electron-builder 26 also supports two mutually exclusive options (Azure Trusted Signing wins automatically when set):

- `win.signtoolOptions`: custom signtool.exe options.
- `win.azureSignOptions`: Azure Trusted Signing.

### macOS

```ts
export default defineConfig({
  builderConfig: {
    mac: {
      identity: 'Developer ID Application: xxx (TEAMID)',
      hardenedRuntime: true,
      entitlements: 'build/entitlements.mac.plist',
      entitlementsInherit: 'build/entitlements.mac.plist',
    },
  },
})
```

Notarization is handled by electron-builder's built-in [@electron/notarize](https://github.com/electron/notarize). Provide any one credential group below and it runs automatically (disable with `mac.notarize: false`):

- `APPLE_API_KEY` + `APPLE_API_KEY_ID` + `APPLE_API_ISSUER` (recommended)
- `APPLE_ID` + `APPLE_APP_SPECIFIC_PASSWORD` + `APPLE_TEAM_ID`
- `APPLE_KEYCHAIN` + `APPLE_KEYCHAIN_PROFILE`

### Relation to auto update

Signing directly affects [auto update](/en/introduce/auto-update):

- macOS auto update requires a signed and notarized app, and the update artifact must be `zip` (`mac.target` already includes `zip` by default), otherwise the system rejects the update.
- On Windows `win.verifyUpdateCodeSignature` defaults to `true` and verifies the update against `publisherName`, so signing is recommended for releases.

## Environment variables

electronup reads two layers from the project root:

```text
.env
.env.{mode}
```

| Mode | Files |
| --- | --- |
| `development` (dev default) | `.env` + `.env.development` |
| `production` (build default) | `.env` + `.env.production` |
| Custom | `.env` + `.env.{mode}` |

Rules:

- `.env.{mode}` is loaded after `.env` and overrides duplicate keys.
- A missing `.env` or `.env.{mode}` is not an error; that layer is simply skipped.
- `NODE_ENV` is written by electronup: `development` in dev, `production` in build.
- In dev, `RENDER_PORT` holds the actual Vite port.
- The renderer only sees `VITE_`-prefixed variables (`import.meta.env`); the main process and preload scripts see all variables (`process.env`).
- For the main process and preload, variables are inlined at build time as `process.env.X`. Both the global `process` and `import process from 'node:process'` (or `'process'`) work; `import { env } from 'node:process'` or other local names (such as `import proc from 'node:process'`) are not inlined.
- Finer-grained files such as `.env.local` are not supported.

## Effective config

After every `electronup build`, the resolved config is written to the packaging output directory (`builderConfig.directories.output`, or `outDir` when not set):

```text
${outDir}/electronup-effective-config.yaml
```

The file is only for troubleshooting; if writing it fails, electronup prints a warning and the build result and exit code are unaffected.

`electronup build --web` only builds the renderer, so it does not produce this file.

It contains the merged `vite`, `pack`, `preload` and `builder` config and is handy for checking whether an option took effect. It may contain absolute paths and internal plugin objects, so treat it as a debugging artifact.

## Full example

```ts
import { resolve } from 'node:path'
import Vue from '@vitejs/plugin-vue'
import { defineConfig } from 'electronup'

export default defineConfig(({ command }) => ({
  renderDir: 'render',
  mainDir: 'main',
  publicDir: 'public',
  resourceDir: 'dist/resource',
  outDir: 'dist/out',

  viteConfig: {
    plugins: [Vue()],
    build: {
      sourcemap: command === 'serve',
    },
  },

  packConfig: {
    external: ['better-sqlite3'],
    noExternal: ['electronup'],
  },

  preload: {
    entry: { preload: resolve(__dirname, 'preload/index.ts') },
  },

  builderConfig: {
    appId: 'com.example.app',
    productName: 'Example',
    publish: [
      { provider: 'github', owner: 'your-org', repo: 'your-app' },
    ],
  },
}))
```
