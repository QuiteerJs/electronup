---
name: electronup-build
description: 运行 electronup dev / electronup build，为 Windows、macOS、Linux 打包指定架构的安装包，只构建渲染进程（--web）或只出目录（--dir），并排查构建/打包失败。用户要启动 Electron 开发环境、打包、出安装包、在 CI 构建或遇到 electronup 构建报错时使用。
---

# 用 electronup 开发与打包

在应用项目里优先通过 `package.json` 脚本或 `pnpm exec electronup …`（npm 用 `npx`）运行，使用项目锁定的 electronup 版本。不确定参数时先跑 `electronup --help` / `electronup build --help`，以所装版本输出为准。

## 开发：`electronup dev`

```bash
electronup                    # 等同 electronup dev
electronup dev -p 3000        # 渲染进程起始端口，默认 8090；占用会自动后移
electronup dev -m staging     # 加载 .env + .env.staging
electronup dev --no-minify    # 不压缩，便于调试
electronup dev build/electronup.config.ts   # 指定配置文件
```

- 启动时清空 `resourceDir`，起 Vite dev server，watch 构建 preload（修改后重启 Electron），watch 主进程并在每次构建成功后（重）启动 Electron；关闭窗口后命令退出。
- 实际端口通过 `RENDER_PORT` 注入主进程。端口必须是 1–65535 的整数，否则报错退出。
- 本机没有 Electron 二进制（`node_modules/electron/dist`）时拉不起窗口，此时用 `build --dir` 验证。

## 构建：`electronup build`

| 目的 | 命令 |
| --- | --- |
| 当前平台 + 当前架构的安装包 | `electronup build` |
| 只出可运行目录（如 `win-unpacked`），最快的打包验证 | `electronup build --dir` |
| 只构建渲染进程静态资源，不打主进程/preload/安装包 | `electronup build --web` |
| Windows（不写架构 = ia32 + x64 两个包） | `electronup build --win` / `--win x64` / `--win x64 --win arm64` |
| macOS（不写架构 = 当前架构） | `electronup build --mac` / `--mac arm64` / `--mac universal` |
| Linux（不写架构 = 当前架构） | `electronup build --linux` / `--linux x64` / `--linux armv7l` |
| 关闭 asar | `electronup build --no-asar` |
| 其他环境变量文件 | `electronup build -m staging` |
| 交互式向导（仅 TTY） | `electronup build -o` |

规则：

- 合法架构：win `ia32|x64|arm64`，mac `x64|arm64|universal`，linux `x64|arm64|armv7l`；其他值报错退出，不会回退 x64。
- **一次只构建一个平台**；同时传多个平台按 `--win` > `--mac` > `--linux` 取最高者。多平台请分多次执行（CI 里用矩阵）。
- 宿主限制：mac 包只能在 macOS 上构建；Windows 上不能构建 Linux 包；Linux 上 `--win` 不拦截但通常需要 Wine 等工具链。
- `-o` 会接管平台/架构/压缩/`--dir`，不与 `--win` 等叠加；在 CI、IDE 任务等非 TTY 环境会直接退出（码 1），**agent 不要用 `-o`**，改用显式参数。
- build 会先清空 `resourceDir` 和 `outDir`（`--web` 只清 `resourceDir`），清理发生在配置执行与目标校验之后，参数错误时上次产物保持不变。

## 产物

| 路径 | 内容 |
| --- | --- |
| `dist/resource/` | `index.html` 等渲染产物、`electron.cjs`（主进程）、`preload*.cjs` |
| `dist/out/` | 安装包、`*-unpacked` 目录、更新元数据（`latest*.yml`）、`electronup-effective-config.yaml` |

`electronup-effective-config.yaml` 是本次实际生效的合并配置快照（`--web` 不生成），排查“配置有没有生效”先看它。

## 推荐验证顺序

1. `electronup build --web`：渲染进程能否构建。
2. `electronup build --dir`：主进程、preload 与 electron-builder 是否正常，运行 `*-unpacked` 里的可执行文件做冒烟。
3. 目标平台安装包：`electronup build --win x64` 等。

## 排查

| 报错 / 现象 | 处理 |
| --- | --- |
| 下载 electron 压缩包超时 / 失败 | 设置镜像：`ELECTRON_MIRROR=https://cdn.npmmirror.com/binaries/electron/`，`ELECTRON_CUSTOM_DIR={{ version }}` |
| 找不到主进程入口 | 入口必须是 `${mainDir}/index.ts`（TypeScript） |
| 拒绝清空目录 | `resourceDir` / `outDir` 指向了项目根、主目录、`node_modules`、`.git` 或符号链接，改成项目内专用输出目录 |
| 清空时报占用 | 关闭仍在运行的打包应用或占用 `dist` 的进程后重试 |
| Linux 构建要求 snapcraft | electron-builder 默认 Linux 目标含 snap，配置 `builderConfig.linux.target: ['AppImage']`（或 deb/rpm） |
| 打包后启动白屏 / 找不到模块 | 见 `electronup-config` skill 的“常见不生效” |
| `--no-asar` 未传却想关闭 asar | 在 `builderConfig.asar: false` 设置 |

## CI 示例（GitHub Actions 矩阵）

```yaml
strategy:
  matrix:
    include:
      - { os: windows-latest, args: --win x64 }
      - { os: macos-latest, args: --mac }
      - { os: ubuntu-latest, args: --linux x64 }
runs-on: ${{ matrix.os }}
steps:
  - uses: actions/checkout@v4
  - uses: pnpm/action-setup@v4
  - uses: actions/setup-node@v4
    with: { node-version: 24, cache: pnpm }
  - run: pnpm install --frozen-lockfile
  - run: pnpm exec electronup build ${{ matrix.args }}
```

签名证书等通过 CI secrets 以环境变量注入（`CSC_LINK`、`CSC_KEY_PASSWORD`、`APPLE_*`），见 `electronup-config` 的签名一节。

详细文档：<https://quiteerjs.github.io/electronup/introduce/cli>。
