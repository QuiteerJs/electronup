---
title: 命令行界面
---

# {{ $frontmatter.title }}

## 帮助信息

```bash
electronup --help
```

::: details 点击查看输出（electronup 0.3.0）
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

::: details 点击查看输出（electronup 0.3.0）
```bash
electronup/0.3.0

Usage:
  $ electronup build [config-file]

Options:
  -o , --option       自定义 , 自定义构建选项
  --dir               只生成目录
  --web               只构建渲染进程 ( web ) , 不构建主进程 / preload , 也不生成安装包
  --no-asar           asar false (default: true)
  --win [arch]        [ia32 | x64] 构建 win 平台下的输出包 , 不指定架构则输出 ia32 和 x64的两个包
  --mac [arch]        [x64 | arm64 | universal] 构建 mac 平台下的输出包 , 若不指定架构则默认当前操作系统的架构类型
  --linux [arch]      [x64 | arm64 | armv7l] 构建 linux 平台下的输出包 , 若不指定架构则默认当前操作系统的架构类型
  -m , --mode <mode>  [development | production | test | staging | ...] 环境模式
  --no-minify         使主进程和渲染进程代码不进行压缩  (default: true)
  -h, --help          Display this message
```
:::

命令中的 `[config-file]` 是**配置文件路径**（相对项目根目录，也可以是绝对路径），不是项目根目录本身；文件名不限于 `electronup.config.*`，但扩展名需为 `.ts` / `.mjs` / `.cjs` / `.js`。省略时使用根目录下的 `electronup.config.*`；显式指定的文件不存在时直接报错，不会回退到标准名配置。

## 环境模式 `-m` / `--mode`

通过 `mode` 决定加载哪一份环境变量文件。不传时：

- `electronup dev` → `.env` + `.env.development`
- `electronup build` → `.env` + `.env.production`

传入的 `mode` 需要与根目录下的 `.env.{mode}` 文件对应：

```bash
electronup -m test
```

此时加载 `.env` + `.env.test`。

也可以让开发环境加载生产环境变量：

```bash
electronup dev -m production
```

::: tip
`mode` 用于选择 `.env.{mode}` 文件；文件不存在时不会报错，只使用 `.env`。Vite 与 vite-plus pack 的构建模式仍由 `dev` / `build` 命令决定。
:::

## 压缩 `--no-minify`

默认情况下主进程和渲染进程都会压缩。传入 `--no-minify` 后两者都不压缩，便于调试：

```bash
electronup dev --no-minify
electronup build --no-minify
```

模板中的 `dev` 脚本默认带有 `--no-minify`，可以按需去掉。

## `electronup dev`

可省略 `dev`：

```bash
electronup
```

行为：

1. 读取配置文件。
2. 校验并清空 `resourceDir` 后启动 Vite 开发服务器。
3. 构建 preload（如果配置了 `preload`）。
4. 以 watch 模式构建主进程，构建成功后在主进程脚本目录启动 Electron。
5. 主进程代码变化会重新构建并重启 Electron；渲染进程由 Vite 热更新。

关闭 Electron 窗口后，开发命令会随之退出。

### 指定配置文件

```bash
electronup [config-file]
electronup dev [config-file]
```

::: tip
不指定时按优先级查找项目根目录下的 `electronup.config.ts`、`.mjs`、`.cjs`、`.js`。
:::

### 端口 `-p` / `--port`

指定渲染进程开发服务器的起始端口，默认 `8090`：

```bash
electronup -p 3000
electronup --port 3000
```

端口被占用时会自动向后寻找可用端口，并把最终端口通过 `RENDER_PORT` 环境变量注入主进程。

## `electronup build`

构建安装包。未指定平台时使用当前操作系统和当前架构。

每次执行只能构建一个平台的产物；需要多平台时请分批执行。

### 指定配置文件

```bash
electronup build
electronup build build/electronup.config.ts
```

省略时同样按默认优先级查找项目根目录下的配置文件。

### 交互式向导 `-o` / `--option`

```bash
electronup build -o
```

传入后会依次询问：

1. 是否压缩代码；
2. 是否生成安装包（选择否则等价于 `--dir`）；
3. 构建平台；
4. 打包架构（可多选）；
5. 确认后开始构建。

向导会根据当前系统限制可选项：

| 宿主系统 | 向导中可选的平台 |
| --- | --- |
| Windows | Windows |
| macOS | Windows、macOS、Linux |
| Linux | Linux |

macOS 的 `universal` 架构、Linux 的 `armv7l` 架构需要目标机器支持对应指令集，部分生态工具可能不完整，请按需选择。

::: warning
`-o` 会接管平台、架构、压缩与 `--dir` 等选项，不会与 `--win`、`--mac` 等命令行参数叠加使用。
:::

### 只生成目录 `--dir`

```bash
electronup build --dir
```

不生成安装包，只输出可直接运行的未打包目录（例如 Windows 下的 `win-unpacked`）。

### 只构建 web `--web`

```bash
electronup build --web
```

只构建渲染进程（Vite 产物），跳过 preload、主进程构建与 electron-builder 打包。适用于只需要渲染进程静态资源（例如部署到 Web 服务器或单独调试前端）的场景。

- 产物输出到 `resourceDir`（默认 `dist/resource`），不会生成安装包。
- 因为不产出安装包，`--web` 不会清空 `outDir`。
- 该选项与平台、架构、`-o` 向导无关，会直接跳过目标解析。

### 关闭 asar `--no-asar`

```bash
electronup build --no-asar
```

[asar](https://github.com/electron/asar) 会把应用文件归档成单个文件。传递 `--no-asar` 后 electronup 会显式设置 `asar: false`；不传时保持 electron-builder 的默认行为（默认开启），也可以在 `builderConfig.asar` 中自行覆盖。

### Windows `--win`

```bash
electronup build --win        # 未指定架构时输出 ia32 与 x64 两个包
electronup build --win x64
electronup build --win ia32
```

### macOS `--mac`

```bash
electronup build --mac
electronup build --mac x64
electronup build --mac arm64
electronup build --mac universal
```

::: warning
macOS 安装包只能在 macOS 上构建。在 Windows / Linux 上传入 `--mac` 会直接报错。
:::

不指定架构时使用当前系统架构。`universal` 为双架构包，同时包含 x64 与 arm64。

### Linux `--linux`

```bash
electronup build --linux
electronup build --linux x64
electronup build --linux arm64
electronup build --linux armv7l
```

::: warning
Windows 系统不能构建 Linux 包，传入 `--linux` 会直接报错。macOS 与 Linux 上可以构建。
:::

非交互模式下 electronup 不会拦截 Linux 宿主上的 `--win`，但 electron-builder 通常需要额外的宿主工具链（例如 Wine），是否可行请以 electron-builder 文档和实际环境为准；交互式向导在 Linux 下不提供 Windows 选项。

### 平台参数优先级

同时传入多个平台参数时，按 `--win` > `--mac` > `--linux` 处理，只构建优先级最高的平台。平台可用性校验先于优先级判断：例如在 Windows 上传入 `--win --mac` 仍会因 macOS 的构建限制而直接报错。

## 配置文件的查找顺序

未显式指定配置文件时，electronup 会在项目根目录依次查找：

1. `electronup.config.ts`
2. `electronup.config.mjs`
3. `electronup.config.cjs`
4. `electronup.config.js`

使用第一个找到的文件。显式传入的路径按相对项目根目录处理。

## 构建产物

| 路径 | 默认值 | 说明 |
| --- | --- | --- |
| `resourceDir` | `dist/resource` | 渲染进程、主进程、preload 的构建输出 |
| `outDir` | `dist/out` | electron-builder 的安装包输出 |
| `electronup-effective-config.yaml` | 打包输出目录下（默认 `outDir`，配置了 `builderConfig.directories.output` 时为该目录） | 构建结束后写入的实际生效配置，便于排查问题（`--web` 不生成） |

::: warning 目录会被清空
`electronup dev` 启动时会清空 `resourceDir` 的内容；`electronup build` 会清空 `resourceDir` 与 `outDir` 的内容（`build --web` 只清空 `resourceDir`）。不要把这两个目录指向源码目录。

- 清理发生在配置文件（含函数式导出）执行与平台 / 架构校验之后：参数错误、平台不支持或在 `-o` 向导中取消时，上一次的产物保持不变。
- 指向项目根目录及其上级、用户主目录、文件系统根目录、`node_modules` / `.git`，或目录本身是符号链接 / junction 时，会直接报错且不删除任何内容；指向项目之外的其他目录时会给出提示。
- 目录被占用（例如打包出的应用仍在运行）时会报错退出，已有产物不会被删掉一部分。
:::
