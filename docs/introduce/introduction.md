---
title: 快速上手
---

# {{ $frontmatter.title }}

本节从创建项目开始，带你跑通 `electronup` 的开发与构建流程。

## 环境要求

::: tip 基本要求
- Node.js `>= 22`
- npm、yarn 或 pnpm
- 使用模板创建项目时需要可访问 GitHub 的网络环境
:::

## 创建模板

使用 npm：

```bash
npm create electronup@latest
```

使用 yarn：

```bash
yarn create electronup
```

使用 pnpm：

```bash
pnpm create electronup
```

这条命令会安装并执行 [create-electronup](https://github.com/QuiteerJs/electronup/tree/main/packages/create-electronup)。根据提示输入项目名称、选择框架即可。

也可以直接指定项目名和模板：

```bash
pnpm create electronup my-app --template vue
```

### 可选模板

| 模板参数 | 说明 |
| --- | --- |
| `vanilla` | 原生 TypeScript + Vite |
| `vue` | Vue 3 |
| `react` | React + TypeScript |
| `react-swc` | React + TypeScript + SWC |
| `solid` | Solid |

选择 `react` 时，脚手架还会询问使用普通 TypeScript 还是 SWC 变体。

::: tip 模板来源
模板不在脚手架包内，而是通过 [degit](https://github.com/Rich-Harris/degit) 从 [electronup-template](https://github.com/QuiteerJs/electronup-template) 的对应分支实时拉取，因此需要能访问 GitHub。
:::

### 在当前目录创建

项目名称填写 `.` 即可在当前目录创建：

```text
? 项目名称： »
```

此时如果当前目录不为空，脚手架会先询问是否清空（`.git` 会被保留）。

## 安装依赖

```bash
pnpm install
```

或使用 npm / yarn：

```bash
npm install
```

```bash
yarn install
```

模板默认使用 pnpm，其他包管理器同样可用。

## 常用脚本

模板的 `package.json` 通常包含以下脚本：

```json
{
  "scripts": {
    "dev": "electronup --no-minify",
    "build": "electronup build",
    "dir": "electronup build --dir --no-asar --no-minify",
    "postinstall": "electron-builder install-app-deps"
  }
}
```

- `dev`：启动开发环境。`--no-minify` 只是为了让调试输出更易读，可以按需去掉。
- `build`：构建当前平台的安装包。
- `dir`：只生成未打包目录，便于快速验证。
- `postinstall`：重建原生依赖。项目没有原生依赖时可以不保留。

## 第一次运行

```bash
pnpm dev
```

执行后 electronup 会：

1. 读取 `electronup.config.ts`。
2. 启动 Vite 开发服务器（默认端口 `8090`，被占用时自动顺延）。
3. 构建 preload 与主进程。
4. 启动项目内的 Electron，并打开窗口。

渲染进程修改由 Vite 热更新；主进程修改会重新构建并重启 Electron。preload 在开发模式下只构建一次，修改后请重新执行 `pnpm dev`。

## 构建

```bash
pnpm build
```

默认构建当前操作系统和当前架构。需要指定平台或架构时：

```bash
electronup build --win x64
electronup build --mac arm64
electronup build --linux x64
```

也可以使用交互式向导：

```bash
electronup build -o
```

构建完成后，安装包位于 `dist/out`（可通过 `outDir` 修改），中间产物位于 `dist/resource`（可通过 `resourceDir` 修改）。

## 手动接入已有项目

如果不想使用模板，可以手动安装：

```bash
pnpm add -D electronup electron typescript
```

最小目录结构：

```text
my-app/
├── main/
│   └── index.ts
├── render/
│   └── index.html
├── electronup.config.ts
├── package.json
└── tsconfig.json
```

`electronup.config.ts`：

```ts
import { defineConfig } from 'electronup'

export default defineConfig({})
```

`main/index.ts` 需要根据开发 / 生产环境加载不同地址：

```ts
import { resolve } from 'node:path'
import { app, BrowserWindow } from 'electron'

const url = process.env.NODE_ENV === 'development'
  ? `http://localhost:${process.env.RENDER_PORT}`
  : `file://${resolve(__dirname, 'index.html')}`

void app.whenReady().then(() => {
  const win = new BrowserWindow()
  void win.loadURL(url)
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin')
    app.quit()
})
```

`package.json` 中加入：

```json
{
  "main": "dist/resource/electron.cjs",
  "scripts": {
    "dev": "electronup --no-minify",
    "build": "electronup build"
  }
}
```

当前版本主进程构建产物为 `electron.cjs`。Electron 应用打包时，electron-builder 会根据实际产物生成入口；开发时 electronup 会直接启动构建后的主进程文件。

## 下一步

- 了解目录约定：[目录介绍](/introduce/catalogue)
- 查看全部命令参数：[命令行界面](/introduce/cli)
- 配置 Vite、vite-plus pack 与 electron-builder：[配置](/introduce/config)
