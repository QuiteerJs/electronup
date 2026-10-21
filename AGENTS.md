# AGENTS.md

本仓库面向 AI 编程 agent（以及人类贡献者）的统一工作指南。开始任何任务前先读完本文；只做被明确要求的改动，保持 diff 聚焦。

## 项目概览

electronup 是把 **Vite**（渲染进程）+ **vite-plus pack**（主进程 / preload）+ **electron-builder**（打包）融合在一起的 Electron 构建工具，保留原有工具的配置习惯，通过一个 `electronup.config.ts` 管理全部构建与打包。

| 路径 | 说明 |
| --- | --- |
| `packages/electronup` | 核心包：CLI、配置解析、dev/build 流程、updater 导出（发布名 `electronup`） |
| `packages/create-electronup` | 脚手架，用 degit 拉取 `electronup-template` 模板 |
| `playground/electronup-test` | 端到端示例项目，CI 冒烟构建也用它 |
| `template` | 脚手架测试入口；仅 `template/package.json` 被跟踪，`template/*` 其余内容被忽略 |
| `docs` | VitePress 中英双语文档站（`docs/` 中文，`docs/en/` 英文） |
| `.github/workflows/smoke-build.yml` | 三平台 `build --dir` 冒烟 + Windows 自签名代码签名冒烟 |

## 环境与安装

- Node.js `>= 22`（仓库 `.node-version` 为 `24.12.0`），pnpm `10.30.3`（`packageManager` 字段）。**只用 pnpm**，不要用 npm/yarn 生成 lockfile。
- 依赖安装：`pnpm install`。`.npmrc` 已配置 npmmirror 镜像（含 electron / electron-builder binaries）。
- Electron 二进制在安装时按需下载；本机若没有 `node_modules/electron/dist`，`electronup dev` 无法真正拉起窗口，此时用构建 / 单元测试验证。
- electron-builder 打包需要 electron 压缩包，缓存在 `%LOCALAPPDATA%\electron\Cache`（Windows）。网络受限、直接运行构建出的 CLI 时，可临时设置：

```powershell
$env:ELECTRON_MIRROR = 'https://cdn.npmmirror.com/binaries/electron/'
$env:ELECTRON_CUSTOM_DIR = '{{ version }}'
```

## 常用命令

| 目的 | 命令 |
| --- | --- |
| 单元测试（vitest 5） | `pnpm test`（等价 `pnpm --filter electronup test`） |
| 单文件/过滤测试 | `pnpm --filter electronup exec vp test run pack` |
| 类型检查 | `pnpm typecheck`（`tsc -p packages/electronup/tsconfig.json`） |
| Lint（oxlint，不支持 Markdown） | `pnpm lint` / `pnpm lint:fix` |
| 构建核心包（vp pack） | `pnpm --filter electronup build` |
| 文档开发 / 构建 | `pnpm docs:dev` / `pnpm docs:build` |
| 示例项目构建（走 workspace bin） | `pnpm --filter electronup-test build:web` / `build:dir` |
| 端到端（与 CI 一致，直连 dist） | 先 `pnpm --filter electronup build`，再进入 `playground/electronup-test` 执行 `node ../../packages/electronup/dist/bin/electronup.mjs build --web`（或 `--dir`） |
| 发布物自检 | `pnpm --filter electronup pack --pack-destination <临时目录>`，确认 tarball 只含 `dist` 与 README/LICENSE/package.json |
| 交互式提交 | `pnpm commit`（`qui gc`） |

修改代码后的最小验收：`pnpm lint` + `pnpm typecheck` + `pnpm test` + `pnpm --filter electronup build`；涉及文档再跑 `pnpm docs:build`；涉及构建/打包再跑 playground 的 `--web` / `--dir`。

## 代码结构与调用链

```text
src/cli.ts (cac 命令解析)
  └─ transform/getConfig.ts (parser-config 读取 electronup.config.{ts,mjs,cjs,js})
       └─ runner/watch.ts | runner/build.ts
            └─ configs/electronup.ts (组装 vite / pack / preload / builder)
                 ├─ configs/vite.ts        渲染进程 Vite 配置
                 ├─ configs/pack.ts        主进程 vite-plus pack 配置 + dev 时启动 Electron
                 ├─ configs/preload.ts     preload 归一化（默认 CJS、输出到 resourceDir）
                 └─ configs/builder.ts     electron-builder 预置项与合并
```

- dev：vite 起渲染 dev server；pack watch 主进程并在成功回调里启动 Electron；`.env` / `.env.{mode}` 注入。
- build：vite build → pack preload → pack 主进程 → electron-builder 打包 → 写 `outDir/electronup-effective-config.yaml`（`--web` 除外）。
- `--web`：只构建渲染进程，跳过 targets 解析、preload/主进程构建与 electron-builder，且不清空 `outDir`。

## 必须遵守的约定与易错点

1. **updater 必须保持惰性加载**：`electronup.config.ts` 在普通 Node 进程里加载，模块顶层不能 import `electron` / `electron-updater`，也不能读取 `autoUpdater` 属性；一律通过 `createRequire` 在真正调用时取值（见 `src/updater.ts`）。
2. **cac 负向选项默认是 `true`**：`--no-minify`、`--no-asar` 未传时解析结果为 `true`，显式传入才是 `false`。CLI 层必须归一化：build 用 `minify !== false`；`store.asar` 只有显式 `--no-asar` 时才为 `false`，否则保持 `undefined` 不覆盖 electron-builder 默认值。
3. **主进程 / preload 产物是 CJS**：输出为 `resourceDir/electron.cjs`、`preload*.cjs`；示例项目的 `package.json#main` 必须指向 `dist/resource/electron.cjs`。改输出格式要同步示例、类型与文档。
4. **electron 是 optional peer 依赖**：运行期通过项目根的 `createRequire` 解析，不要放进 `dependencies`；测试里也不要真的启动 Electron。
5. **builder 预置值**：`appId = com.<规整后的包名>`（scoped 去掉 `@`、连续点合并、纯非 ASCII 回退 `com.electronup`）；mac 默认 `['dmg', 'zip']`；nsis 为 `perMachine: false` 的非一键安装；默认不再注入 deeplink `protocols`。`nsis` / `mac` / `directories` 对用户配置做浅合并，用户字段优先。
6. **dotenv 必须可降级**：`.env` 与 `.env.{mode}` 都可能不存在，缺失时返回 `{}` 而不是抛错。
7. **跨平台**：路径统一用 `node:path`；测试断言要容忍 Windows 分隔符；不要在代码里写死 `/` 或平台专属路径。
8. **渲染进程 `modulePreload.polyfill = false`** 是 vite-plus-core 未导出 polyfill 子路径的规避，不要改回。
9. **文档中英同步**：`docs/` 与 `docs/en/` 各 17 篇一一对应；新增页面要在 `docs/.vitepress/config.ts` 的两种语言 nav/sidebar 里都登记。站点 base 在 Vercel 为 `/`，GitHub Pages 为 `/electronup/`。
10. **不要提交构建产物与临时文件**：`dist/`、`docs/.vitepress/{cache,dist}`、`*.tgz`、验收日志、误克隆的目录都不要进仓库；提交前用 `git status` 确认。

## 代码风格

- 注释与提交信息使用中文；Conventional Commits：`type(scope): 中文描述`，常用 scope：`build`、`preload`、`updater`、`cli`、`docs`、`ci`、`deps`、`agents`。
- 无分号、单引号、2 空格缩进、LF；单行 `if (x) { return }` 风格；`no-console` 规则只允许 `console.error`，其他输出需 `// oxlint-disable-next-line no-console`。
- 不要手工编辑 `pnpm-lock.yaml`（用 pnpm 命令生成）；不要在提交里顺手跑全仓格式化（历史风格与 fmt 配置可能仍有个别不一致）。
- 新增/修改逻辑尽量补同目录 `*.test.ts`；测试用 vitest，mock `fs-extra`、`node:module` 等 IO 边界。

## 发布

- 版本号由 `release` 脚本（`qui r`）生成，不要手改 `version`；npm 发布需要凭证，日常任务不要执行 `release` / `publish`。
- `CHANGELOG*` 由发布工具生成，不要手工维护。

## 相关文档

- 中文文档：`docs/`；英文文档：`docs/en/`；线上站点：<https://quiteerjs.github.io/electronup/>
- 自动更新说明：`docs/introduce/auto-update.md`
- 各插件包（electron-modules 系列）文档在 `docs/plugins/`
