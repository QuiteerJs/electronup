---
title: 总览
---

# {{ $frontmatter.title }}

electronup 本身只负责构建流程；下面这些包按需安装，用于创建项目或补充运行时能力。

## 构建相关

- [create-electronup](https://github.com/QuiteerJs/electronup/tree/main/packages/create-electronup)：创建 electronup 项目模板的命令行，支持 `vanilla`、`vue`、`react`、`react-swc`、`solid`。
- [@quiteer/parser-config](https://github.com/QuiteerJs/parser-config)：按路径解析用户配置文件，electronup 用它读取 `electronup.config.ts` 等文件。

## 运行时相关

以下七个包在本仓库 `packages/electron-*` 下维护，与 electronup 配套使用，可按需单独安装：

- [@quiteer/electron-ipc](https://github.com/QuiteerJs/electronup/tree/main/packages/electron-ipc)：主进程 IPC 预设通道，一次 `init()` 即可让渲染进程操作所属窗口、调用 `node:path` 能力。
- [@quiteer/electron-preload](https://github.com/QuiteerJs/electronup/tree/main/packages/electron-preload)：预加载脚本，导入即拿到路径，暴露 `$ipc` / `$clipboard` / `$webFrame` 三组已收敛的 API。
- [@quiteer/electron-browser](https://github.com/QuiteerJs/electronup/tree/main/packages/electron-browser)：窗口管理，统一注册、随处取窗、响应式操作。
- [@quiteer/electron-menu](https://github.com/QuiteerJs/electronup/tree/main/packages/electron-menu)：菜单管理，统一注册、随处取用、按路径定位菜单项、改动自动同步。
- [@quiteer/electron-tray](https://github.com/QuiteerJs/electronup/tree/main/packages/electron-tray)：系统托盘管理，统一注册、随处取用、图标状态切换、菜单与事件一把梭。
- [@quiteer/electron-app](https://github.com/QuiteerJs/electronup/tree/main/packages/electron-app)：应用生命周期样板，单实例锁、deep link、macOS activate 重建主窗口、优雅退出。
- [@quiteer/electron-shortcut](https://github.com/QuiteerJs/electronup/tree/main/packages/electron-shortcut)：全局快捷键管理，按名注册、冲突检测、按窗口焦点启停、退出自动注销。

从旧版本升级 electron-preload / electron-ipc 请看[升级指南](./migration)。

这些运行时包不依赖 electronup 的命令行，也不影响构建产物目录；请根据自己的主进程入口按需引入。
