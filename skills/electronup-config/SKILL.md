---
name: electronup-config
description: 编写或修改 electronup.config.ts（defineConfig、目录、viteConfig、packConfig、preload、builderConfig、签名、.env 环境变量）。用户要改 electronup 配置、加 Vite 插件、配置 preload、调整 electron-builder 选项、排查“配置不生效”时使用。
---

# 编写 electronup.config

配置写在项目根目录，查找顺序 `electronup.config.ts` > `.mjs` > `.cjs` > `.js`；也可以把路径作为 CLI 的 `[config-file]` 参数传入（不存在时直接报错，不回退）。

```ts
import { defineConfig } from 'electronup'

// 对象、Promise、函数、异步函数都可以；函数参数为 { command: 'serve' | 'build', mode, root }
export default defineConfig(({ command }) => ({
  // ...
}))
```

配置文件运行在普通 Node 进程里：**不要在配置里 import `electron` 或调用 updater API**。

## 改配置前先做

1. 读现有 `electronup.config.*` 和 `package.json`，确认 electronup 版本（`node_modules/electronup/package.json`）。
2. 不确定某字段是否生效时，跑一次 `electronup build --dir` 并查看打包输出目录里的 `electronup-effective-config.yaml`（合并后的 vite / 主进程 / preload / builder 配置快照）。

## 目录（顶层字段）

| 字段 | 默认值 | 说明 |
| --- | --- | --- |
| `renderDir` | `render` | Vite `root`，放 `index.html` |
| `mainDir` | `main` | 主进程入口为 `${mainDir}/index.{ts,mts,cts,js,mjs,cjs}`（按顺序取第一个存在的） |
| `publicDir` | `public` | Vite 静态目录 |
| `libDir` | `lib` | electron-builder `extraFiles` |
| `resourceDir` | `dist/resource` | 渲染/主进程/preload 产物，**dev 和 build 前会被清空** |
| `outDir` | `dist/out` | 安装包输出，**build 前会被清空**（配置了 `builderConfig.directories.output` 时以它为准） |

- 永远不要把 `resourceDir` / `outDir` 指向源码目录。指向项目根及其上级、主目录、文件系统根、`node_modules`、`.git` 或符号链接时 electronup 会拒绝并报错。
- 改了 `resourceDir` 要同步 `package.json#main`（`<resourceDir>/electron.cjs`）。
- `renderDir` / `mainDir` / `publicDir` 只能用这些顶层字段改，`viteConfig.root`、`viteConfig.publicDir` 不生效。

## viteConfig（渲染进程）

类型是 Vite `UserConfig`（去掉 `publicDir`、`ssr`），插件、`resolve.alias`、`css`、`build.sourcemap` 等照常写。electronup 接管：

- `root`、`publicDir`、`build.outDir`（= `resourceDir`）、`build.minify`（由 `--no-minify` 决定）：不可覆盖。
- `base` 默认 `./`，可覆盖（打包后用 `file://` 加载，一般保持 `./`）。
- `build.modulePreload` 默认 `{ polyfill: false }`，可覆盖。

```ts
import Vue from '@vitejs/plugin-vue'

export default defineConfig({
  viteConfig: { plugins: [Vue()] },
})
```

## packConfig（主进程）

只暴露两个字段，其余（入口、格式、输出）固定：产物为 `resourceDir/electron.cjs`（CommonJS）。

```ts
export default defineConfig({
  packConfig: {
    external: ['better-sqlite3'],     // 原生模块等不打包的依赖；electron 已默认 external
    noExternal: ['some-esm-only-pkg'], // 强制打进产物
  },
})
```

external 的依赖必须在应用的 `dependencies` 里，否则打包后运行时找不到。使用 electronup 的自动更新导出时必须 `noExternal: ['electronup']`（见 `electronup-auto-update`）。

## preload

单个对象或数组（多入口），`entry` 必填。默认 CJS、输出到 `resourceDir`、文件名取 entry 的 key（`preload` → `preload.cjs`），环境变量与主进程一致，`electron` 默认 external。

```ts
import { resolve } from 'node:path'

export default defineConfig({
  preload: {
    entry: { preload: resolve(__dirname, 'preload/index.ts') },
  },
})
```

- 主进程里用 `resolve(__dirname, 'preload.cjs')` 引用产物。
- dev 模式 preload 以 watch 构建，修改后自动重新构建并重启 Electron。
- 单项可写 `outDir`（必须在项目根内；在 `resourceDir` 之外时会自动加入默认 builder `files`，自定义了 `files` 就要自己包含）。
- Electron 版本支持 ESM preload 时才考虑 `format: 'esm'`。
- 其余可用字段以所装版本的类型定义（`ElectronupConfig['preload']`）为准。

## builderConfig（electron-builder，仅 build 生效）

类型是 electron-builder `Configuration`，用户字段覆盖预置项；`nsis` / `mac` / `directories` 是浅合并。预置：

- `appId` = `com.` + 规整后的包名；`productName` = 包名 —— 正式应用请显式设置这两项。
- `files` = `${resourceDir}/**/*`，`extraFiles` = `[libDir]`。
- `nsis`：非一键、当前用户安装、可选目录、简体中文、桌面与开始菜单快捷方式。
- `mac.target` = `['dmg', 'zip']`（zip 是 mac 自动更新必需的）。
- `electronVersion` 自动读取项目内 electron 版本。
- `asar`：`--no-asar` > `builderConfig.asar` > electron-builder 默认（开启）。

```ts
export default defineConfig({
  builderConfig: {
    appId: 'com.example.app',
    productName: 'Example',
    linux: { target: ['AppImage'] }, // 默认含 snap，需要 snapcraft 且不支持自动更新
  },
})
```

命令行 `--win/--mac/--linux/--dir` 生成的 targets 优先于 `builderConfig` 中的目标；长期固定目标就写在 `win` / `mac` / `linux` 里并不再传对应参数。

### 签名

electronup 不预置签名。证书用环境变量，不要提交进仓库：

- Windows：`CSC_LINK`（pfx 路径或 base64）+ `CSC_KEY_PASSWORD`；也可用 `win.signtoolOptions` 或 `win.azureSignOptions`（Azure Trusted Signing）。
- macOS（只能在 macOS 上）：`mac.identity`、`hardenedRuntime`、`entitlements`；公证提供 `APPLE_API_KEY`+`APPLE_API_KEY_ID`+`APPLE_API_ISSUER`（或 `APPLE_ID`+`APPLE_APP_SPECIFIC_PASSWORD`+`APPLE_TEAM_ID`）即自动执行，`mac.notarize: false` 可关闭。

## 环境变量

- 加载根目录 `.env` + `.env.{mode}`（后者覆盖前者，文件不存在不报错）；dev 默认 mode `development`，build 默认 `production`，用 `-m <mode>` 切换（渲染进程的 `import.meta.env.MODE` 同样跟随）。主进程 / preload 不读 `.env.local`；渲染进程由 Vite 从项目根加载，遵循 Vite 规则。
- `NODE_ENV`：dev 为 `development`，build 为 `production`；dev 额外注入 `RENDER_PORT`。
- 渲染进程只能用 `VITE_` 前缀变量（`import.meta.env`）；主进程与 preload 可用全部变量（`process.env.X`，构建时内联）。
- 内联只认全局 `process.env.X` 或 `import process from 'node:process'` 后的 `process.env.X`；`import { env } from 'node:process'` 或改名导入不会被内联。

## 常见“不生效”

| 现象 | 原因 |
| --- | --- |
| 改 `viteConfig.root` / `build.outDir` 无效 | 由 electronup 接管，改顶层目录字段 |
| 改主进程入口/格式无效 | 入口文件名固定为 `index`（扩展名 ts/mts/cts/js/mjs/cjs），格式固定 CJS |
| 打包后 `Cannot find module 'x'` | `x` 被 external 但不在 `dependencies`；或应打进产物却没加 `noExternal` |
| 打包后白屏 | `base` 被改成 `/`，或 `loadURL` 没用 `file://` + `index.html` |
| preload 改了没反应 | dev 下应自动重启 Electron；检查终端是否有 preload 构建报错，以及主进程引用的产物路径 |

详细文档：<https://quiteerjs.github.io/electronup/introduce/config>。
