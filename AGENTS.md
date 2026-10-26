# AGENTS.md

本仓库面向 AI 编程 agent（以及人类贡献者）的统一工作指南。开始任何任务前先读完本文；只做被明确要求的改动，保持 diff 聚焦。

## 项目概览

electronup 是把 **Vite**（渲染进程、主进程 / preload）+ **electron-builder**（打包）融合在一起的 Electron 构建工具，保留原有工具的配置习惯，通过一个 `electronup.config.ts` 管理全部构建与打包。

| 路径 | 说明 |
| --- | --- |
| `packages/electronup` | 核心包：CLI、配置解析、dev/build 流程、updater 导出（发布名 `electronup`） |
| `packages/create-electronup` | 脚手架，用 degit 拉取 `electronup-template` 模板 |
| `playground/electronup-test` | 端到端示例项目，CI 冒烟构建也用它 |
| `template` | 脚手架测试入口；仅 `template/package.json` 被跟踪，`template/*` 其余内容被忽略 |
| `docs` | VitePress 中英双语文档站（`docs/` 中文，`docs/en/` 英文） |
| `skills` | 面向 electronup 使用者的 Agent Skills（`SKILL.md`），通过根目录 `.claude-plugin/` 作为 Claude Code 插件分发；维护者 skill 在 `.claude/skills/` |
| `.github/workflows/smoke-build.yml` | 全包 typecheck / test + 三平台 `build --dir` 冒烟 + Windows 自签名代码签名冒烟 |

## 环境与安装

- Node.js `^22.18.0 || ^24.11.0 || >=26.0.0`（与 vite-plus 的运行要求一致，仓库 `.node-version` 为 `24.12.0`），pnpm `10.30.3`（`packageManager` 字段）。**只用 pnpm**，不要用 npm/yarn 生成 lockfile。
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
| 单元测试（vitest 5） | `pnpm test`（`packages/*` 全部包；create-electronup 的远端模板校验需 `CREATE_ELECTRONUP_REMOTE=1`） |
| 单文件/过滤测试 | `pnpm --filter electronup exec vp test run pack` |
| 类型检查 | `pnpm typecheck`（electronup 与 create-electronup 两个 tsconfig） |
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
                 ├─ configs/pack.ts        主进程 Vite SSR 构建配置 ( 依赖外部化规则 ) + dev 时启动 Electron
                 ├─ configs/preload.ts     preload 归一化（默认 CJS、输出到 resourceDir）
                 └─ configs/builder.ts     electron-builder 预置项与合并
```

- dev：vite 起渲染 dev server；vite build watch 主进程，每次写盘后由 `electronup:start-electron` 插件启动 / 重启 Electron；`.env` / `.env.{mode}` 注入。
- build：vite build 渲染进程 → vite build preload → vite build 主进程 → electron-builder 打包 → 写 `outDir/electronup-effective-config.yaml`（`--web` 除外）。
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
10. **目录清理只走 `cleanDirs`**：`resourceDir` / `outDir` 的清空统一由 `runner/clean.ts` → `utils/clean.ts` 完成（拒绝项目根及上级、用户主目录、文件系统根、`node_modules` / `.git`、链接目标；整体 rename 后再删除），并且必须放在配置函数执行、平台 / 架构校验与 `-o` 向导之后；不要在 CLI 层或别处直接 `rmSync` 输出目录。
11. **不要提交构建产物与临时文件**：`dist/`、`docs/.vitepress/{cache,dist}`、`*.tgz`、验收日志、误克隆的目录都不要进仓库；提交前用 `git status` 确认。
12. **skills 与实现同步**：修改 CLI 参数、配置项默认值或 updater 行为时，同步更新 `skills/*/SKILL.md` 中对应描述。

## 代码风格

- 注释与提交信息使用中文；Conventional Commits：`type(scope): 中文描述`，常用 scope：`build`、`preload`、`updater`、`cli`、`docs`、`ci`、`deps`、`agents`。
- 无分号、单引号、2 空格缩进、LF；单行 `if (x) { return }` 风格；`no-console` 规则只允许 `console.error`，其他输出需 `// oxlint-disable-next-line no-console`。
- 不要手工编辑 `pnpm-lock.yaml`（用 pnpm 命令生成）；不要在提交里顺手跑全仓格式化（历史风格与 fmt 配置可能仍有个别不一致）。
- 新增/修改逻辑尽量补同目录 `*.test.ts`；测试用 vitest，mock `fs-extra`、`node:module` 等 IO 边界。

## 发布

- 固定采用“agent 准备，用户发布”：用户最后在 `packages/electronup`（或脚手架包目录）执行 `pnpm publish`。没有明确授权时 agent 不得执行 publish。不要再使用 `qui r` 或恢复升版、构建、上传串在一起的 release 脚本。
- 先查询官方 npm 注册表版本，选取未使用的新版本。版本由根目录 `pnpm version:core --release <版本> --yes` 生成；脚手架用 `version:scaffold`。二者采用 bumpp 的相对路径输入，只处理指定包，不自动提交、打标签或推送。禁止手改 version。
- 升版后必须读取目标 package.json 确认版本，不能以提交信息、命令成功或日志里的目标版本代替文件验收。Windows 上旧 qui r 向 bumpp 传入反斜杠绝对路径可能未匹配到任何文件，曾生成空的升版提交。
- 完成必要检查后提交版本和代码，再运行 `pnpm changelog` 生成 CHANGELOG 并单独提交；不要手工维护 CHANGELOG。
- 将已验收提交合入 main（能快进则用 --ff-only，不能快进先处理差异，不强推），在最终提交创建 `<包名>-v<实际版本>` 标签。标签必须包含对应版本和 CHANGELOG。
- 重新 build、pack 并用 `.github/scripts/check-release-package.mjs` 校验实际 tarball；确认 tarball、源码版本、标签三者一致。推送 main 和本次标签，核对同一提交的 Smoke Build。
- 保持工作区干净。本机缓存和个人记录放入 .git/info/exclude，不能为了发版顺手删除或提交。版本准备失败时先核对文件、提交、标签与注册表，禁止盲目重跑升版。
- 两个包的 prepublishOnly 会校验 main/master、干净工作区、当前版本标签，并重新构建。用户只需 pnpm publish，npm 登录和 2FA 由用户完成。
- 详细操作见 [.github/RELEASING.md](.github/RELEASING.md)。

## 相关文档

- 中文文档：`docs/`；英文文档：`docs/en/`；线上站点：<https://quiteerjs.github.io/electronup/>
- 自动更新说明：`docs/introduce/auto-update.md`
- 各插件包（electron-modules 系列）文档在 `docs/plugins/`
