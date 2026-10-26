---
title: CLI
---

# {{ $frontmatter.title }}

## Help

```bash
electronup --help
```

::: details Output (electronup 0.3.0)
```bash
electronup/0.3.0

Usage:
  $ electronup [config-file]

Commands:
  [config-file]        等同于electronup dev ,启动开发环境热更新
  build [config-file]  开始构建服务 , 若不指定平台则默认当前操作系统的架构类型

For more info, run any command with the `--help` flag:
  $ electronup --help
  $ electronup build --help

Options:
  -p , --port <port>  [number] 渲染进程的端口号 ，如果占用会切换非占用的端口
  -m , --mode <mode>  [development | production | test | staging | ...] 环境模式
  --no-minify         使主进程和渲染进程代码不进行压缩  (default: true)
  -h, --help          Display this message
  -v, --version       Display version number
```
:::

```bash
electronup build --help
```

::: details Output (electronup 0.3.0)
```bash
electronup/0.3.0

Usage:
  $ electronup build [config-file]

Options:
  -o , --option       自定义 , 自定义构建选项
  --dir               只生成目录
  --web               只构建渲染进程 ( web ) , 不构建主进程 / preload , 也不生成安装包
  --no-asar           asar false (default: true)
  --win [arch]        [ia32 | x64 | arm64] 构建 win 平台下的输出包 , 不指定架构则输出 ia32 和 x64的两个包
  --mac [arch]        [x64 | arm64 | universal] 构建 mac 平台下的输出包 , 若不指定架构则默认当前操作系统的架构类型
  --linux [arch]      [x64 | arm64 | armv7l] 构建 linux 平台下的输出包 , 若不指定架构则默认当前操作系统的架构类型
  -m , --mode <mode>  [development | production | test | staging | ...] 环境模式
  --no-minify         使主进程和渲染进程代码不进行压缩  (default: true)
  -h, --help          Display this message
```
:::

The help text still uses Chinese for option descriptions. `[config-file]` is a **config file path** (relative to the project root, or absolute), not a project root. The file name is not limited to `electronup.config.*`, but the extension must be `.ts` / `.mjs` / `.cjs` / `.js`. When omitted, `electronup.config.*` in the project root is used; if an explicitly given file does not exist, electronup fails instead of falling back to the standard config name.

## Mode `-m` / `--mode`

`mode` selects which environment file to load. Without it:

- `electronup dev` → `.env` + `.env.development`
- `electronup build` → `.env` + `.env.production`

The value must match an `.env.{mode}` file in the project root:

```bash
electronup -m test
```

This loads `.env` + `.env.test`.

You can also make dev load production variables:

```bash
electronup dev -m production
```

::: tip
`mode` only selects the `.env.{mode}` file. A missing file is not an error; only `.env` is used. The build mode of Vite is still determined by `dev` / `build`.
:::

## Minification `--no-minify`

By default both the main process and the renderer are minified. `--no-minify` disables minification for easier debugging:

```bash
electronup dev --no-minify
electronup build --no-minify
```

Template `dev` scripts pass `--no-minify` by default; remove it if you prefer.

## `electronup dev`

`dev` can be omitted:

```bash
electronup
```

What happens:

1. The config file is loaded.
2. `resourceDir` is checked and cleared, then the Vite dev server starts.
3. Preload scripts are built (if `preload` is configured).
4. The main process is built in watch mode; a successful build launches Electron with the built main file.
5. Main process changes rebuild and restart Electron; the renderer uses Vite HMR.

Closing the Electron window exits the dev command.

### Config file

```bash
electronup [config-file]
electronup dev [config-file]
```

::: tip
When omitted, electronup looks for `electronup.config.ts`, `.mjs`, `.cjs`, `.js` in that order in the project root.
:::

### Port `-p` / `--port`

Sets the starting port of the renderer dev server. The default is `8090`:

```bash
electronup -p 3000
electronup --port 3000
```

If the port is taken, the next free port is used. The final port is injected into the main process as `RENDER_PORT`.

The port must be an integer from `1` to `65535`. Values such as `abc`, `0`, an empty string or an out-of-range number fail with exit code `1` instead of silently falling back to the default port.

## `electronup build`

Builds installers. Without platform flags it builds for the current OS and architecture.

Only one platform is built per run. Run the command multiple times for multiple platforms.

### Config file

```bash
electronup build
electronup build build/electronup.config.ts
```

When omitted, the same default lookup order applies.

### Interactive wizard `-o` / `--option`

```bash
electronup build -o
```

The wizard asks:

1. Whether to minify the code.
2. Whether to produce an installer (answering no is equivalent to `--dir`).
3. Which platform to build.
4. Which architectures to package (multi-select).
5. Confirmation, then the build starts.

Available options depend on the host OS:

| Host | Platforms offered |
| --- | --- |
| Windows | Windows |
| macOS | Windows, macOS, Linux |
| Linux | Linux |

macOS `universal` and Linux `armv7l` require support on the target machines and may have gaps in the ecosystem; choose them deliberately.

::: warning
`-o` takes over platform, architecture, minification and `--dir`. Do not combine it with `--win`, `--mac` and so on.
:::

The wizard needs a terminal (TTY). In non-interactive environments such as CI or an IDE task runner, `-o` fails with exit code `1`; use `--win` / `--mac` / `--linux` / `--dir` instead. Cancelling with `Ctrl+C` / `Esc` exits with `130`, and answering "no" at the final confirmation exits with `1`; neither cleans nor builds anything.

### Directory only `--dir`

```bash
electronup build --dir
```

Skips installer creation and outputs an unpacked directory (for example `win-unpacked` on Windows).

### Web only `--web`

```bash
electronup build --web
```

Builds only the renderer (Vite output) and skips preload, the main process and electron-builder packaging. Use it when you only need the renderer's static assets, for example to deploy them to a web server or to debug the frontend on its own.

- The output goes to `resourceDir` (`dist/resource` by default); no installer is produced.
- Because no installer is produced, `--web` does not clear `outDir`.
- The flag ignores platform, architecture and the `-o` wizard, and skips target resolution entirely.

### Disable asar `--no-asar`

```bash
electronup build --no-asar
```

[asar](https://github.com/electron/asar) packs app files into a single archive. Precedence: an explicit `--no-asar` > `builderConfig.asar` > electron-builder's default (enabled). Passing `--no-asar` sets `asar: false` even when `builderConfig.asar` is `true`; without it, `builderConfig.asar` is used, and if that is unset electron-builder decides.

### Windows `--win`

```bash
electronup build --win        # ia32 and x64 packages when no arch is given
electronup build --win x64
electronup build --win ia32
electronup build --win arm64
electronup build --win x64 --win arm64   # repeat the flag to build several archs
```

Each platform only accepts the architectures listed in the help (win: `ia32` / `x64` / `arm64`; mac: `x64` / `arm64` / `universal`; linux: `x64` / `arm64` / `armv7l`). Any other value fails with exit code `1` instead of falling back to x64.

### macOS `--mac`

```bash
electronup build --mac
electronup build --mac x64
electronup build --mac arm64
electronup build --mac universal
```

::: warning
macOS installers can only be built on macOS. Passing `--mac` on Windows / Linux fails immediately.
:::

Without an architecture, the current one is used. `universal` bundles both x64 and arm64.

### Linux `--linux`

```bash
electronup build --linux
electronup build --linux x64
electronup build --linux arm64
electronup build --linux armv7l
```

::: warning
Linux packages cannot be built on Windows; passing `--linux` fails immediately. macOS and Linux hosts are supported.
:::

The non-interactive CLI does not block `--win` on a Linux host, but electron-builder usually needs extra host tooling (for example Wine). Check electron-builder's documentation and your environment. The interactive wizard does not offer Windows on Linux.

### Platform precedence

When multiple platform flags are passed, they are resolved as `--win` > `--mac` > `--linux`; only the platform with the highest priority is built. Availability is validated before precedence: for example, passing `--win --mac` on Windows still fails because of the macOS build restriction.

## Config file lookup order

Without an explicit path, electronup checks the project root in this order:

1. `electronup.config.ts`
2. `electronup.config.mjs`
3. `electronup.config.cjs`
4. `electronup.config.js`

The first match wins. Explicit paths are resolved relative to the project root.

## Build output

| Path | Default | Description |
| --- | --- | --- |
| `resourceDir` | `dist/resource` | Renderer, main process and preload output |
| `outDir` | `dist/out` | electron-builder installer output |
| `electronup-effective-config.yaml` | under the packaging output directory (`outDir`, or `builderConfig.directories.output` when set) | Effective config written after a build, useful for troubleshooting (not written for `--web`) |

::: warning Directories are cleared
`electronup dev` clears the contents of `resourceDir`; `electronup build` clears `resourceDir` and `outDir` (`build --web` clears only `resourceDir`). Never point these options at source directories.

- Cleaning happens after the config file (including function exports) is evaluated and platforms / architectures are validated: invalid arguments, unsupported platforms or cancelling the `-o` wizard leave the previous output untouched.
- Every cleared directory is logged as `[electronup] 已清空 <dir>` ("cleared"); when `build --web` clears `resourceDir`, the previous main process / preload output is removed as well.
- If a directory is the project root or one of its parents, the home directory, a filesystem root, inside `node_modules` / `.git`, or is itself a symlink / junction, electronup exits with an error and deletes nothing. Directories outside the project are allowed with a notice.
- If a directory is in use (for example, the packaged app is still running), electronup exits with an error instead of leaving it half deleted.
:::
