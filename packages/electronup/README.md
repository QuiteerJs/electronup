# electronup

[![license](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE)

> 融合 Vite、vite-plus pack（vp pack）与 electron-builder 的 Electron 构建工具，一个配置文件完成多环境、多目标的构建与打包。

## 文档

- 中文文档：https://quiteerjs.github.io/electronup/
- English docs：https://quiteerjs.github.io/electronup/en/
- 仓库根目录还提供 [English README](https://github.com/QuiteerJs/electronup/blob/main/README.en.md)。

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

## 环境要求

- Node.js `^22.18.0 || ^24.11.0 || >=26.0.0`（与 vite-plus 的运行要求一致）
- Electron `>= 28`（作为可选对等依赖，由应用项目自行安装）
- 主进程与 preload 入口使用 TypeScript；因为使用 vite-plus pack 构建主进程，当前不支持 JavaScript 主进程入口。

## 特性

- **多框架模板**：`create-electronup` 支持 `vanilla`、`vue`、`react`、`react-swc`、`solid`。
- **双进程开发**：渲染进程 Vite HMR；主进程由 vite-plus pack 监听并自动重启 Electron。
- **统一环境变量**：根目录 `.env` / `.env.{mode}` 由 dotenv 读取，主进程与 preload 直接使用，渲染进程可使用 `VITE_` 前缀变量。
- **平台感知**：默认构建当前系统与架构，也可通过命令行或交互式向导选择平台和架构。
- **单文件配置**：`electronup.config.ts` 管理路径、Vite、pack、preload 与 electron-builder。
- **预置可覆盖**：内置常用路径与 electron-builder 配置，保留原工具的配置习惯。

## 快速使用

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

```json
{
  "scripts": {
    "dev": "electronup --no-minify",
    "build": "electronup build"
  }
}
```

## 自动更新

内置 `electron-updater`，在主进程 `app.whenReady()` 中初始化：

```ts
import { app } from 'electron'
import { autoUpdater, initAutoUpdater } from 'electronup'

void app.whenReady().then(() => {
  autoUpdater.on('error', error => console.error('更新失败：', error))
  initAutoUpdater({ checkOnStart: true, autoDownload: true })
})
```

发布配置写在 `electronup.config.ts` 的 `builderConfig` 中：

```ts
export default defineConfig({
  builderConfig: {
    publish: [{ provider: 'github', owner: 'your-org', repo: 'your-app' }],
  },
})
```

electron-builder 的 `publish` 配置决定更新源。开发环境会跳过检查；生产环境会在启动时自动检查。需要自定义更新 UI 时，监听导出的 `autoUpdater` 事件即可。

> **打包注意**：打包后的应用运行时需要能解析到 `electron-updater`。请把它加入项目 `dependencies`（生产依赖，electron-builder 会自动打包），并在 `packConfig.noExternal` 中加入 `'electronup'`，让更新辅助代码打进主进程产物。

## 示例

> https://github.com/QuiteerJs/electronup/tree/main/playground/electronup-test

## License

[MIT](./LICENSE)
