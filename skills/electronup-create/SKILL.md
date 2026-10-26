---
name: electronup-create
description: 用 create-electronup 新建 electronup + Electron 项目，或把 electronup 接入已有项目。用户提到创建/初始化 Electron 项目、create-electronup、electronup 模板（vanilla/vue/react/react-swc/solid）或“给现有项目加 electronup”时使用。
---

# 创建 electronup 项目

electronup 是 Electron 应用的构建 CLI：Vite 构建渲染进程，主进程与 preload 由 electronup 内部打包，electron-builder 生成安装包，全部通过一个 `electronup.config.ts` 配置。

## 先确认环境

- Node.js `^22.18.0 || ^24.11.0 || >=26.0.0`（`node -v` 检查，不满足先让用户升级）。
- npm / yarn / pnpm 都可以；沿用项目已有的包管理器（看 lockfile）。
- 用脚手架时需要能访问 GitHub（模板是实时拉取的）。

## 方式一：脚手架新建

```bash
pnpm create electronup my-app --template vue   # -t 为短参数
# 或 npm create electronup@latest my-app -- --template vue
```

- 可用模板：`vanilla`、`vue`、`react`、`react-swc`、`solid`。传入无效模板或不传时会进入交互选择；选 `react`（包括 `-t react`）时还会再询问 TypeScript / SWC 变体；`-t react-swc` 不会询问。想完全不交互，就同时传项目名和除 `react` 之外的模板，并保证目标目录为空。
- 不传项目名会交互询问；项目名为 `.` 表示当前目录。目标目录非空时会询问是否清空（保留 `.git`），**清空前先征得用户同意**。
- 模板来自 `https://github.com/QuiteerJs/electronup-template.git#<template>`（degit 拉取，不缓存）。网络失败时提示用户检查 GitHub 访问，不要改用其他仓库。
- 脚手架**不会安装依赖**，完成后执行：

```bash
cd my-app
pnpm install
pnpm dev
```

## 方式二：接入已有项目

```bash
pnpm add -D electronup electron typescript
```

electronup 自带 Vite、electron-builder 等构建依赖，应用只需再装 `electron`（可选 peer，由应用决定版本，建议 `>= 28`）和 `typescript`。然后按约定整理目录（都可在配置里改名）：

```text
my-app/
├── main/index.ts          # 主进程入口，文件名固定为 index.ts，必须是 TypeScript
├── preload/index.ts       # 可选，需在配置 preload.entry 中登记
├── render/index.html      # 渲染进程根目录（Vite root）
├── public/                # 原样拷贝的静态资源
├── lib/                   # 可选，打包时作为 extraFiles 复制
├── .env / .env.{mode}     # 可选
├── electronup.config.ts
└── package.json
```

`package.json` 关键字段：

```json
{
  "main": "dist/resource/electron.cjs",
  "scripts": {
    "dev": "electronup --no-minify",
    "build": "electronup build",
    "build:dir": "electronup build --dir"
  }
}
```

- `main` 必须指向主进程产物 `resourceDir/electron.cjs`（默认 `dist/resource/electron.cjs`）；改了 `resourceDir` 要同步修改。
- 把 `dist/` 加入 `.gitignore`。

最小 `electronup.config.ts`：

```ts
import { defineConfig } from 'electronup'

export default defineConfig({})
```

主进程加载页面的常见写法（dev 时 electronup 注入 `RENDER_PORT`，产物与 `index.html` 同在 `resourceDir`）：

```ts
import { resolve } from 'node:path'
import process from 'node:process'
import { app, BrowserWindow } from 'electron'

const url = process.env.NODE_ENV === 'development'
  ? `http://localhost:${process.env.RENDER_PORT}`
  : `file://${resolve(__dirname, 'index.html')}`

void app.whenReady().then(() => {
  const win = new BrowserWindow({
    webPreferences: { preload: resolve(__dirname, 'preload.cjs') },
  })
  void win.loadURL(url)
})
```

## 验证

1. `pnpm dev`：Electron 窗口打开且渲染进程可热更新。没有下载到 Electron 二进制时窗口拉不起来，可改用下一步验证。
2. `pnpm exec electronup build --dir`：生成未打包目录（如 `dist/out/win-unpacked`）。

后续配置见 `electronup-config` skill，打包见 `electronup-build`，自动更新见 `electronup-auto-update`。官方文档：<https://quiteerjs.github.io/electronup/>。
