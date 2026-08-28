---
title: 总览
---

# {{ $frontmatter.title }}

> 以下是 [electronup cli](https://github.com/QuiteerJs/electronup) 相关的包。

- [create-electronup](https://github.com/QuiteerJs/electronup/tree/main/packages/create-electronup)：创建 electronup cli 驱动的模板的命令行。
- [@quiteer/parser-config](https://github.com/QuiteerJs/parser-config)：通过路径解析配置。

以下五个运行时库由 [electron-modules](https://github.com/QuiteerJs/electron-modules) 仓库维护，与 electronup 配套使用，可按需单独安装：

- [@quiteer/electron-ipc](https://github.com/QuiteerJs/electron-modules/tree/main/packages/ipc)：主进程 IPC 预设通道，一次 `init()` 即可让渲染进程操作所属窗口、调用 `node:path` 能力。
- [@quiteer/electron-preload](https://github.com/QuiteerJs/electron-modules/tree/main/packages/preload)：预加载脚本，导入即拿到路径，暴露 `$ipc` / `$clipboard` / `$webFrame` 三组已收敛的 API。
- [@quiteer/electron-browser](https://github.com/QuiteerJs/electron-modules/tree/main/packages/browser)：窗口管理，统一注册、随处取窗、响应式操作。
- [@quiteer/electron-menu](https://github.com/QuiteerJs/electron-modules/tree/main/packages/menu)：菜单管理，统一注册、随处取用、按路径定位菜单项、改动自动同步。
- [@quiteer/electron-tray](https://github.com/QuiteerJs/electron-modules/tree/main/packages/tray)：系统托盘管理，统一注册、随处取用、图标状态切换、菜单与事件一把梭。
