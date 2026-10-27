---
title: Project structure
---

# {{ $frontmatter.title }}

## Template layout

Templates are fetched by [create-electronup](/en/plugins/create-electronup) from [electronup-template](https://github.com/QuiteerJs/electronup-template). Each framework maps to a branch (`vanilla` / `vue` / `react` / `react-swc` / `solid`), and the files differ slightly between branches.

The directory structure electronup expects:

```text
my-app/
├── main/                     # Main process source; entry is main/index.ts
│   └── index.ts
├── preload/                  # Preload script source (optional)
│   └── index.ts
├── render/                   # Renderer root; index.html lives here
│   ├── index.html
│   └── main.ts
├── public/                   # Static assets copied as-is during build
├── lib/                      # Extra native files (optional)
├── .env                      # Loaded in every mode
├── .env.development          # Loaded in dev mode
├── .env.production           # Loaded in build mode
├── .env.staging              # Loaded with --mode staging
├── .env.test                 # Loaded with --mode test
├── electronup.config.ts      # electronup configuration
├── tsconfig.json             # Renderer TypeScript config
├── tsconfig.node.json        # Main process / preload TypeScript config
└── package.json
```

`main`, `preload`, `render`, `public` and `lib` are defaults and can be changed with the matching options in `electronup.config.ts`. Output directories such as `dist/resource` and `dist/out` should not be committed to Git.

## Source directories

### `main`

Main process source. The default entry is `main/index.ts`; `.mts` / `.cts` / `.js` / `.mjs` / `.cjs` extensions also work.

- Built by Vite, always as CommonJS.
- Output goes to `dist/resource/electron.cjs` by default.
- Watched in dev: changes trigger a rebuild and an Electron restart.
- The entry file name is fixed to `index.ts`; `packConfig` cannot change it in the current version.

### `preload`

Preload script source. It is optional and only built when `preload.entry` is configured:

```ts
// electronup.config.ts
import { resolve } from 'node:path'
import { defineConfig } from 'electronup'

export default defineConfig({
  preload: {
    entry: { preload: resolve(__dirname, 'preload/index.ts') },
  },
})
```

Output is CommonJS by default and lands next to the main process output (`resourceDir`). In dev, editing a preload script rebuilds it and restarts Electron.

### `render`

Renderer root, which becomes Vite's `root`. `index.html` must live here. Framework code, styles and assets go into this directory, and the build output goes to `resourceDir`.

### `public`

Vite `public` directory. Files here are not processed and are copied as-is into the renderer output directory (`resourceDir`). Good for `robots.txt` or icons that need no processing.

### `lib`

electron-builder `extraFiles` directory. electronup neither builds nor modifies it; electron-builder copies it into the app installation directory. Use it for native libraries or external executables that must ship with the app. The directory is optional, but a configured `extraFiles` entry without content may lead to an incomplete package.

## Environment files

`.env` is loaded in every mode. `.env.{mode}` is loaded on top and overrides duplicate keys:

| File | Loaded when |
| --- | --- |
| `.env` | Always |
| `.env.development` | `electronup dev` (default mode `development`) |
| `.env.production` | `electronup build` (default mode `production`) |
| `.env.staging` | `electronup -m staging` |
| `.env.test` | `electronup -m test` |

See [Configuration → Environment variables](/en/introduce/config#environment-variables) for details.

## Config files

### `electronup.config.ts`

The core config file for paths, Vite, pack, preload scripts and electron-builder. `.mjs`, `.cjs` and `.js` are also supported. See [config file lookup order](/en/introduce/cli#config-file-lookup-order).

### `tsconfig.json` / `tsconfig.node.json`

Templates usually split TypeScript configs between the renderer (browser) and Node-side code (main process / preload). Do not mix them up.

### `package.json`

Dependencies and scripts. The `main` field should point to the main process output, currently `dist/resource/electron.cjs`.

### `.vscode/`, `.npmrc`, `.gitignore`

Editor, package-manager and Git settings shipped with the template. `.npmrc` is read by npm, yarn and pnpm alike.
