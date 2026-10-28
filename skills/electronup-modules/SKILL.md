---
name: electronup-modules
description: 在 Electron 主进程里接入 @quiteer/electron-* 运行时模块包（窗口 browser、IPC 契约 ipc、预加载 preload、应用生命周期 app、菜单 menu、托盘 tray、全局快捷键 shortcut）。用户要管理窗口、写类型安全的 IPC、配 preload 通道白名单、做单实例 / deep link / 退出清理、加菜单托盘快捷键，或排查这些包的报错时使用。
---

# 接入 @quiteer/electron-* 模块包

七个包都是可选的运行时库，与 electronup 的构建流程无关，按需安装。完整文档：<https://quiteerjs.github.io/electronup/plugins/>。

| 包 | 解决什么 |
| --- | --- |
| `@quiteer/electron-app` | 单实例锁、deep link、macOS activate 重建主窗口、优雅退出 |
| `@quiteer/electron-browser` | 窗口按名注册与取用，安全的 `webPreferences` 默认值与导航守卫 |
| `@quiteer/electron-ipc` | 内置窗口 / 路径通道，`defineContract` 端到端类型安全的 IPC |
| `@quiteer/electron-preload` | sandbox 可用的预加载脚本，`$ipc` 通道白名单、`$clipboard`、`$webFrame` |
| `@quiteer/electron-menu` | 菜单按名注册，按 `id` 路径更新菜单项 |
| `@quiteer/electron-tray` | 托盘按名注册，多状态图标 |
| `@quiteer/electron-shortcut` | 全局快捷键按名注册、冲突检测、按窗口焦点启停 |

## 动手前先做

1. 读项目 `package.json`：确认用的是 electronup（主进程产物为 CJS）还是别的构建工具，以及 `electron` 版本（preload 需要 `>= 44`，其余 `>= 30`）。
2. 读主进程入口（electronup 默认 `main/index.ts`）和现有的 preload，避免和已有的 `ipcMain.handle` / `contextBridge` 重复。

## 安装位置（electronup 项目必看）

electronup 把主进程打成 CJS。exports 只有 `import` 条件的纯 ESM 包（除 preload 外这些模块包都是）不管放在哪里都会自动打进 `electron.cjs`；electron-preload 必须在 `dependencies`，因为运行期要用包里的 `index.cjs`：

```bash
pnpm add -D @quiteer/electron-app @quiteer/electron-browser @quiteer/electron-ipc   # 打进 electron.cjs，安装包里不重复带
pnpm add @quiteer/electron-preload                                                   # 运行期要用包里的 index.cjs
```

用 electron-preload 时不要再用 electronup 的 `preload` 配置去构建它。

## 推荐写法

共享契约只依赖 `/web` 入口，主进程和渲染层都能引用：

```ts
// shared/api.ts
import { channel, defineContract } from '@quiteer/electron-ipc/web'

export const api = defineContract({
  invoke: { 'user:get': channel<(id: string) => User>() },
  send: { 'app:log': channel<(msg: string) => void>() },
  on: { 'download:progress': channel<(percent: number) => void>() },
})
```

主进程入口里 `setupApp` 必须**顶层同步调用**（放进 `whenReady` 会错过 macOS 启动时的 `open-url`）：

```ts
import { setupApp } from '@quiteer/electron-app'
import { windows } from '@quiteer/electron-browser'
import { channelsOf, handleContract, Ipc } from '@quiteer/electron-ipc'
import { createPreload } from '@quiteer/electron-preload/main'
import { api } from '../shared/api'

const allowedOrigins = ['file://', 'http://localhost:5173'] // dev server 的 origin 也要加
setupApp({
  windows,
  mainWindow: 'main',
  onReady: () => {
    Ipc.init({ allowedOrigins })
    handleContract(api, {
      invoke: { 'user:get': (ctx, id) => db.users.find(id) },
      send: { 'app:log': (ctx, msg) => logger.info(msg) },
    }, { allowedOrigins })
  },
  createMainWindow: () => windows.create({
    name: 'main',
    url,
    webPreferences: { ...createPreload({ channels: channelsOf(api) }) },
  }),
})
```

渲染层用 `createClient(api)`：`await client.invoke('user:get', '1')` 返回 `Promise<User>`，`client.on` 的回调不带 event。

## 易错点

- **白名单**：preload 3.x 的 `$ipc` 只放行 `createPreload({ channels })` 声明的通道，未声明的通道直接抛「未在 xxx 白名单中」。用契约时传 `channelsOf(api)`。自己也传 `additionalArguments` 时要与 `createPreload()` 的返回值合并，不能覆盖。
- **剪贴板**：`window.$clipboard` 只有 `createPreload({ clipboard: true })` 才存在，全局类型声明为可选。
- **来源校验**：内置通道与契约通道默认只接受主 frame，iframe 调用会被拒绝或忽略；放行要用 `validateSender`，它会完全替代默认校验。
- **重复注册**：同一通道不要既写 `ipcMain.handle` 又放进契约，`handleContract` 会抛 “Attempted to register a second handler”。
- **全局类型**：`$ipc` 用 `WithIpcChannels<PreloadIpc>`，不要用 `PreloadIpc & ExpandPreloadIpc`（后者不会报错）。
- **隐藏到托盘**：窗口 `close` 事件里用 `lifecycle.isQuitting` 区分关闭按钮与应用退出，并设 `quitOnAllWindowsClosed: false`。
- 从 preload 1.x / ipc 3.0 升级按升级指南逐项改：<https://quiteerjs.github.io/electronup/plugins/migration>。

## 验证

- 类型：`tsc --noEmit` 能发现契约 handler 漏写、通道名写错、`invoke` 参数类型不符。
- 运行：`electronup dev` 打开窗口，控制台不应出现白名单或来源校验报错；打包后再跑一次 `electronup build --dir`，确认安装包能启动（ESM 包放错位置的问题只会在运行时暴露）。
