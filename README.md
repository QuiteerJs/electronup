# electronup

[![license](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE) ![](https://img.shields.io/github/stars/QuiteerJs/electronup) ![](https://img.shields.io/github/forks/QuiteerJs/electronup)

[简体中文](./README.md) | [English](./README.en.md)

> 融合 Vite、vite-plus pack（vp pack）与 electron-builder 的 Electron 构建工具，一个配置文件完成多环境、多目标的构建与打包。

## 文档

- 中文文档：https://quiteerjs.github.io/electronup/
- English docs：https://quiteerjs.github.io/electronup/en/

## 特性

- **多框架模板**：`create-electronup` 支持 `vanilla`、`vue`、`react`、`react-swc`、`solid`。
- **双进程开发**：渲染进程 Vite HMR；主进程由 vite-plus pack 监听并自动重启 Electron。
- **统一环境变量**：根目录 `.env` / `.env.{mode}` 由 dotenv 读取，主进程与 preload 直接使用，渲染进程可使用 `VITE_` 前缀变量。
- **单文件配置**：`electronup.config.ts` 管理路径、Vite、pack、preload 与 electron-builder。
- **平台感知**：默认构建当前系统与架构，也可通过命令行或交互式向导选择平台和架构。
- **预置可覆盖**：内置常用路径与 electron-builder 配置，保留原工具的配置习惯。
- **自动更新**：导出 `initAutoUpdater` / `checkForUpdates` / `autoUpdater`，与 electron-builder 发布配置配合使用。

## 环境要求

- Node.js `>= 22`
- Electron `>= 28`（由应用项目自行安装）
- 主进程与 preload 入口使用 TypeScript

## 安装

```bash
npm install electronup -D
```

```bash
yarn add electronup -D
```

```bash
pnpm add electronup -D
```

## 创建项目

```bash
pnpm create electronup
```

或安装到已有项目：

```bash
pnpm add -D electronup electron typescript
```

## 使用

```json
{
  "scripts": {
    "dev": "electronup --no-minify",
    "build": "electronup build",
    "dir": "electronup build --dir --no-asar --no-minify"
  }
}
```

```ts
// electronup.config.ts
import { resolve } from 'node:path'
import { defineConfig } from 'electronup'

export default defineConfig({
  preload: {
    entry: { preload: resolve(__dirname, 'preload/index.ts') },
  },
  builderConfig: {
    appId: 'com.example.app',
  },
})
```

完整配置说明见[配置文档](https://quiteerjs.github.io/electronup/introduce/config)。

## 自动更新

```ts
import { initAutoUpdater } from 'electronup'
import { app } from 'electron'

void app.whenReady().then(() => {
  initAutoUpdater({ checkOnStart: true })
})
```

更新源由 `builderConfig.publish` 决定，详见[自动更新文档](https://quiteerjs.github.io/electronup/introduce/auto-update)。

## 示例

- 本仓库示例：https://github.com/QuiteerJs/electronup/tree/main/playground/electronup-test
- 项目模板：https://github.com/QuiteerJs/electronup-template

## 相关包

- [create-electronup](https://github.com/QuiteerJs/electronup/tree/main/packages/create-electronup)：创建项目模板。
- [@quiteer/parser-config](https://github.com/QuiteerJs/parser-config)：解析配置文件。
- [electron-modules](https://github.com/QuiteerJs/electron-modules)：可选的窗口、菜单、托盘、IPC、preload 运行时包。

## License

[MIT](./LICENSE)
