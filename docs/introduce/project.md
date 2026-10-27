---
title: 项目介绍
---

# {{ $frontmatter.title }}

## 简介

[electronup](https://github.com/QuiteerJs/electronup) 是一个面向 Electron 应用的命令行构建工具。它把渲染进程、主进程、preload 脚本和安装包构建串到同一条流程里：

- 渲染进程由 **Vite** 构建和热更新。
- 主进程由 **Vite** 以 SSR（Node）模式构建和监听。
- preload 脚本同样使用 Vite 构建。
- 安装包由 **electron-builder** 生成。

项目只需要在根目录维护一个 `electronup.config.ts`，其余构建工具的常用配置已经预置，并且大多数预置项都可以覆盖。

::: tip 推荐 TypeScript
主进程与 preload 使用 Vite 构建。主进程入口默认是 `${mainDir}/index.ts`，也支持 `index.mts` / `index.cts` / `index.js` / `index.mjs` / `index.cjs`（同时存在时按此顺序取第一个）。配置文件推荐使用 `electronup.config.ts`。
:::

## 它负责什么

| 能力 | 说明 |
| --- | --- |
| 开发服务 | 启动 Vite 开发服务器，监听主进程改动并在构建成功后启动 / 重启 Electron |
| 构建 | 依次构建渲染进程、preload、主进程，再调用 electron-builder 打包 |
| 路径约定 | 统一管理 `render`、`main`、`public`、`lib`、资源产物和安装包目录 |
| 环境变量 | 读取根目录 `.env` 与 `.env.{mode}`，注入主进程与 preload；`VITE_` 前缀变量在渲染进程可用 |
| 平台选择 | 默认当前平台与架构，支持命令行参数和交互式向导 |
| 更新辅助 | 导出 `initAutoUpdater`、`checkForUpdates` 和 `autoUpdater`，简化 electron-updater 接入 |

## 它不负责什么

为了避免误解，以下几点需要明确：

- **不安装或锁定 Electron**。`electron` 是可选的对等依赖（peer dependency），由应用项目自行安装并选择版本；electronup 构建时会读取项目内的 Electron 版本。
- **不提供窗口、菜单、托盘、IPC 的运行时封装**。这些能力由本仓库 `packages/electron-*` 下的运行时模块包提供，可按需安装，见[插件总览](/plugins/)。
- **不替代 Vite、electron-builder 的完整文档**。electronup 只做预置与编排，未覆盖的配置项应查阅对应工具的官方文档。
- **不内置代码签名证书**。macOS 公证、Windows 代码签名等仍由 electron-builder 的配置和你的证书环境决定，具体配置见[签名与公证](/introduce/config#签名与公证)。

## 前置要求

| 依赖 | 要求 |
| --- | --- |
| Node.js | `^22.18.0 \|\| ^24.11.0 \|\| >=26.0.0`（见 `packages/electronup/package.json` 的 `engines`） |
| 包管理器 | npm、yarn 或 pnpm 均可 |
| Electron | 建议 `>= 28`；由应用项目安装 |
| TypeScript | 主进程与 preload 入口必须是 TypeScript |
| Git | 仅使用 `create-electronup` 拉取远程模板时需要 |

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

`electronup` 已把 `vite`、`electron-builder` 等构建依赖列入自身依赖；应用项目通常只需要再安装 `electron` 和 `typescript`：

```json
{
  "devDependencies": {
    "electron": "^40.6.1",
    "electronup": "^0.4.0",
    "typescript": "^5.9.3"
  }
}
```

## 特性

- **多框架模板**：`create-electronup` 支持 `vanilla`、`vue`、`react`、`react-swc`、`solid`。
- **双进程开发**：渲染进程 HMR；主进程改动触发重新构建并重启 Electron。
- **统一环境变量**：根目录 `.env` / `.env.{mode}` 由 dotenv 读取，主进程与 preload 直接使用，渲染进程可使用 `VITE_` 前缀变量。
- **单文件配置**：`electronup.config.ts` 管理路径、Vite、pack、preload 与 electron-builder。
- **平台感知**：未指定平台时按当前操作系统与架构构建；也可显式选择 Windows / macOS / Linux 及架构。
- **预置配置可覆盖**：路径、`viteConfig`、`packConfig`、`builderConfig` 均按约定合并。
- **构建结果可检查**：构建结束后会在输出目录写入 `electronup-effective-config.yaml`。

## 相关包

| 包 | 作用 |
| --- | --- |
| [`electronup`](https://www.npmjs.com/package/electronup) | 本项目的命令行与配置 API |
| [`create-electronup`](https://www.npmjs.com/package/create-electronup) | 从远程模板仓库创建项目 |
| [`@quiteer/parser-config`](https://www.npmjs.com/package/@quiteer/parser-config) | 解析 `electronup.config.ts` 等配置文件 |
| [`@quiteer/electron-*`](/plugins/#运行时相关) | 可选的窗口、菜单、托盘、IPC、preload、应用生命周期、快捷键运行时包 |

## 平台限制

这些限制来自 electron-builder 或当前实现，属于预期行为：

- macOS 安装包只能在 macOS 上构建。
- Windows 系统不能构建 Linux 包。
- 交互式向导在 Linux 下不提供 Windows 平台选项；非交互式 CLI 不会主动拦截 `--win`，但实际能否成功取决于宿主工具链（例如 Wine）。
- 同一时间只构建一个平台；需要多平台产物时请分多次执行。

更完整的命令说明见[命令行界面](/introduce/cli)，配置细节见[配置](/introduce/config)。

<div style="display:flex;align-items:center;gap:12px;margin-top:32px">
  <img src="/group.jpg" style="height:40px;border-radius:8px" alt="Electron 技术框架交流群" />
  <span>Electron 技术框架交流群：12354891</span>
</div>
