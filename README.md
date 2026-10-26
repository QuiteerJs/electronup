# electronup

[![license](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE) ![](https://img.shields.io/github/stars/QuiteerJs/electronup) ![](https://img.shields.io/github/forks/QuiteerJs/electronup)

[简体中文](./README.md) | [English](./README.en.md)

> 融合 Vite 与 electron-builder 的 Electron 构建工具，一个配置文件完成多环境、多目标的构建与打包。

## 文档

- 中文文档：https://quiteerjs.github.io/electronup/
- English docs：https://quiteerjs.github.io/electronup/en/

## 特性

- **多框架模板**：`create-electronup` 支持 `vanilla`、`vue`、`react`、`react-swc`、`solid`。
- **双进程开发**：渲染进程 Vite HMR；主进程由 Vite 监听构建并自动重启 Electron。
- **统一环境变量**：根目录 `.env` / `.env.{mode}` 由 dotenv 读取，主进程与 preload 直接使用，渲染进程可使用 `VITE_` 前缀变量。
- **单文件配置**：`electronup.config.ts` 管理路径、Vite、pack、preload 与 electron-builder。
- **平台感知**：默认构建当前系统与架构，也可通过命令行或交互式向导选择平台和架构。
- **预置可覆盖**：内置常用路径与 electron-builder 配置，保留原工具的配置习惯。
- **自动更新**：导出 `initAutoUpdater` / `checkForUpdates` / `autoUpdater`，与 electron-builder 发布配置配合使用。

## 环境要求

- Node.js `^22.18.0 || ^24.11.0 || >=26.0.0`（与 vite-plus 的运行要求一致；仓库使用 `24.12.0`）
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

在主进程 `app.whenReady()` 之后初始化，事件通过导出的 `autoUpdater` 代理订阅：

```ts
import { autoUpdater, initAutoUpdater } from 'electronup'
import { app } from 'electron'

void app.whenReady().then(() => {
  autoUpdater.on('error', error => console.error('更新失败：', error))
  initAutoUpdater({ checkOnStart: true, autoDownload: true, autoInstallOnAppQuit: true })
})
```

更新源由 `builderConfig.publish` 决定，打包后的应用还需要能解析到 `electron-updater`：

```bash
pnpm add electron-updater   # 作为应用的生产依赖
```

```ts
// electronup.config.ts
export default defineConfig({
  packConfig: {
    noExternal: ['electronup'], // 更新辅助代码内联进主进程产物
  },
  builderConfig: {
    publish: [{ provider: 'github', owner: 'your-org', repo: 'your-app' }],
    linux: { target: ['AppImage'] }, // 默认的 snap 目标不支持自动更新
  },
})
```

开发环境（`app.isPackaged` 为 `false`）不会发起检查。Windows 使用 NSIS、macOS 使用 zip（需签名）、Linux 使用 AppImage / deb / rpm。参数、事件与验收方式详见[自动更新文档](https://quiteerjs.github.io/electronup/introduce/auto-update)。

## AI Agent Skills

仓库的 [`skills/`](./skills) 目录提供了供 AI 编程助手使用的 Agent Skills（`SKILL.md` 格式），覆盖创建项目、编写配置、开发与打包、接入自动更新。在 Claude Code 中安装：

```bash
/plugin marketplace add QuiteerJs/electronup
/plugin install electronup@electronup
```

也可以把 `skills/` 下需要的目录复制到项目的 `.claude/skills/`（或其他支持 Agent Skills 的工具对应目录）。

## 示例

- 本仓库示例：https://github.com/QuiteerJs/electronup/tree/main/playground/electronup-test
- 项目模板：https://github.com/QuiteerJs/electronup-template

## 相关包

- [create-electronup](https://github.com/QuiteerJs/electronup/tree/main/packages/create-electronup)：创建项目模板。
- [@quiteer/parser-config](https://github.com/QuiteerJs/parser-config)：解析配置文件。
- [electron-modules](https://github.com/QuiteerJs/electron-modules)：可选的窗口、菜单、托盘、IPC、preload 运行时包。

## License

[MIT](./LICENSE)
