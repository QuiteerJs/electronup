# CLAUDE.md

本仓库的统一 agent 指南在 [AGENTS.md](./AGENTS.md)，请先完整阅读；下面是 Claude Code 的快速入口。

## 仓库一句话

electronup monorepo：`packages/electronup` 是核心 CLI/构建工具（Vite + vite-plus pack + electron-builder），`docs/` 是中英双语文档站，`playground/electronup-test` 是端到端示例。

## 必记命令

```bash
pnpm install            # 只用 pnpm（packageManager: pnpm@10.30.3）
pnpm test               # 单元测试（vitest 5，11 文件 / 105 用例）
pnpm typecheck          # tsc -p packages/electronup/tsconfig.json
pnpm lint               # oxlint；不支持 Markdown
pnpm --filter electronup build
pnpm docs:build
```

端到端（先构建 CLI）：

```bash
cd playground/electronup-test
node ../../packages/electronup/dist/bin/electronup.mjs build --web   # 只渲染进程
node ../../packages/electronup/dist/bin/electronup.mjs build --dir   # 含主进程/preload/打包
```

## 关键约定

- updater 必须惰性加载：模块顶层不要 import `electron` / `electron-updater`。
- cac 负向选项未传时默认 `true`（`--no-minify` / `--no-asar`），CLI 层要做归一化。
- 主进程与 preload 产物为 CJS（`electron.cjs` / `preload*.cjs`），示例 `main` 指向 `dist/resource/electron.cjs`。
- `electron` 是 optional peer，通过项目根 `createRequire` 解析。
- 清空 `resourceDir` / `outDir` 只能走 `runner/clean.ts`（内部用 `utils/clean.ts` 校验），且必须在配置执行与目标校验之后。
- 文档中英各 17 篇一一对应，新增页面要同时登记两种语言的 nav/sidebar。
- 提交信息格式：`type(scope): 中文描述`；不要提交 `dist/`、`.vitepress` 缓存、`*.tgz`、临时日志。

## 验收

改代码后至少执行：`pnpm lint`、`pnpm typecheck`、`pnpm test`、`pnpm --filter electronup build`；涉及文档跑 `pnpm docs:build`；涉及打包跑上面的 `build --web` 与 `build --dir`。
