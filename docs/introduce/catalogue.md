---
title: 目录介绍
---

# {{ $frontmatter.title }}

## 模板目录概览

模板由 [create-electronup](/plugins/create-electronup) 从远程仓库 [electronup-template](https://github.com/QuiteerJs/electronup-template) 拉取，不同框架对应不同分支（`vanilla` / `vue` / `react` / `react-swc` / `solid`），分支之间的文件会有所差异。

electronup 约定的目录结构如下：

```text
my-app/
├── main/                     # 主进程源码，入口固定为 main/index.ts
│   └── index.ts
├── preload/                  # 预加载脚本源码（可选）
│   └── index.ts
├── render/                   # 渲染进程根目录，index.html 所在位置
│   ├── index.html
│   └── main.ts
├── public/                   # 静态资源，构建时原样拷贝
├── lib/                      # 动态库等额外文件（可选）
├── .env                      # 所有环境都会加载
├── .env.development          # dev 模式加载
├── .env.production           # build 模式加载
├── .env.staging              # --mode staging 时加载
├── .env.test                 # --mode test 时加载
├── electronup.config.ts      # electronup 配置文件
├── tsconfig.json             # 渲染进程 TypeScript 配置
├── tsconfig.node.json        # 主进程 / preload TypeScript 配置
└── package.json
```

上表中的 `main`、`preload`、`render`、`public`、`lib` 都是默认值，可在 `electronup.config.ts` 中通过同名配置项修改；`dist/resource` 与 `dist/out` 等输出目录不会提交到 Git。

## 源码目录

### `main`

主进程源码目录，默认入口为 `main/index.ts`。

- 由 Vite 构建，固定输出 CommonJS 格式。
- 构建产物默认输出到 `dist/resource/electron.cjs`。
- 开发模式下会被监听，代码修改后自动重新构建并重启 Electron。
- 入口文件名固定为 `index.ts`，当前版本不支持通过 `packConfig` 修改入口。

### `preload`

预加载脚本目录，属于可选项。需要在 `electronup.config.ts` 中配置 `preload.entry` 后才会参与构建。

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

默认输出 CommonJS 格式，与主进程产物同目录（`resourceDir`）。开发模式下 preload 只构建一次，修改后需要重新启动开发命令。

### `render`

渲染进程根目录，也就是 Vite 的 `root`，`index.html` 应该位于这里。框架代码、样式和资源都放在该目录内，构建产物输出到 `resourceDir`。

### `public`

Vite 的静态资源目录。该目录下的文件不参与打包，会原样拷贝到渲染进程输出目录（即 `resourceDir`）。适合放置 `robots.txt` 或不经过构建处理的图标等资源。

### `lib`

electron-builder 的 `extraFiles` 目录。electronup 不会构建或修改该目录，打包时由 electron-builder 原样复制到应用的安装目录中，适合放置需要随应用分发的动态库、外部可执行文件等。目录不存在时可以不创建，但如果配置了 `extraFiles` 且内容缺失，产物可能不完整。

## 环境变量文件

`.env` 会被任何模式加载，`.env.{mode}` 在对应模式下追加并覆盖同名变量：

| 文件 | 加载时机 |
| --- | --- |
| `.env` | 始终加载 |
| `.env.development` | `electronup dev`（默认模式 `development`） |
| `.env.production` | `electronup build`（默认模式 `production`） |
| `.env.staging` | `electronup -m staging` |
| `.env.test` | `electronup -m test` |

加载规则详见[配置 - 环境变量](/introduce/config#环境变量)。

## 配置文件

### `electronup.config.ts`

electronup 的核心配置文件，用于配置路径、Vite、pack、preload 和 electron-builder。配置文件不是必须存在 `electronup.config.ts`，也支持 `.mjs`、`.cjs`、`.js`，详见[配置文件的查找顺序](/introduce/cli#配置文件的查找顺序)。

### `tsconfig.json` / `tsconfig.node.json`

模板通常把渲染进程与 Node 侧代码拆成两份 TypeScript 配置。两者分别服务于浏览器环境和 Node 环境，请勿混用。

### `package.json`

项目依赖与脚本入口。`main` 字段应指向主进程构建产物，当前版本为 `dist/resource/electron.cjs`。

### `.vscode/`、`.npmrc`、`.gitignore`

模板附带的编辑器配置、包管理器配置和 Git 忽略规则，可按需调整。`.npmrc` 会被 npm、yarn、pnpm 共同读取。
