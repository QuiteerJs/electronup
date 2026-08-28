# @quiteer/electron-ipc

Electron 主进程 IPC 预设通道：一次 `init()`，渲染进程即可安全地操作所属窗口、调用 `node:path` 能力。

包内不持有任何全局状态，所有窗口操作都来自 `event.sender` 定位的窗口，渲染进程无法越权操作别的窗口。

## 安装

```bash
pnpm add @quiteer/electron-ipc
```

## 快速开始

主进程里初始化：

```ts
import { Ipc } from '@quiteer/electron-ipc'
import { app } from 'electron'

app.whenReady().then(() => {
  Ipc.init()
})
```

渲染进程里按枚举发消息（需配合预加载脚本暴露的 `window.$ipc`）：

```ts
import { EventKeys, IpcWindowOptions } from '@quiteer/electron-ipc/web'

// 最大化当前窗口
window.$ipc.send(EventKeys.WindowOptionsKey, IpcWindowOptions.MAXIMIZE)

// 拼路径, 返回 Promise
const full = await window.$ipc.invoke(EventKeys.FileOptionsKey, 'join', '/user', 'local')
```

## 内置通道

### `__window_options__` — 窗口控制

`send` 单向发送，操作对象是**发起调用的窗口自身**。

| 枚举 | 值 | 说明 |
| --- | --- | --- |
| `DESTROY` | `destroy` | 销毁窗口，触发 `closed` |
| `CLOSE` | `close` | 尝试关闭，等同点关闭按钮（页面可拦截） |
| `SHOW` | `show` | 显示 |
| `HIDE` | `hide` | 隐藏 |
| `FOCUS` | `focus` | 获取焦点 |
| `BLUR` | `blur` | 失去焦点 |
| `MAXIMIZE` | `maximize` | 最大化 |
| `UNMAXIMIZE` | `unmaximize` | 取消最大化 |
| `MINIMIZE` | `minimize` | 最小化 |
| `RESTORE` | `restore` | 从最小化还原 |
| `RELOAD` | `reload` | 刷新 |
| `SET_FULL_SCREEN` | `setFullScreen` | 全屏，附 `flag: boolean` |
| `SET_TITLE` | `setTitle` | 改标题，附 `title: string` |
| `FLASH_FRAME` | `flashFrame` | 任务栏闪烁，附 `flag: boolean` |
| `SWITCH_FOCUS` | `switch-focus` | 聚焦 / 失焦互切 |
| `SWITCH_MAX` | `switch-max` | 最大化 / 还原互切 |
| `SWITCH_MIN` | `switch-min` | 最小化 / 还原互切 |
| `SWITCH_FULL` | `switch-full` | 全屏 / 退出全屏互切 |
| `SWITCH_RESIZABLE` | `switch-resizable` | 可否调整尺寸互切 |
| `SWITCH_MOVABLE` | `switch-movable` | 可否移动互切（Linux 无效） |
| `SWITCH_MINIMIZABLE` | `switch-minimizable` | 可否最小化互切（Linux 无效） |
| `SWITCH_MAXIMIZABLE` | `switch-maximizable` | 可否最大化互切（Linux 无效） |
| `SWITCH_ALWAYS_ON_TOP` | `switch-always-on-top` | 是否置顶互切 |

带参数的调用：

```ts
window.$ipc.send(EventKeys.WindowOptionsKey, IpcWindowOptions.SET_TITLE, '新标题')
window.$ipc.send(EventKeys.WindowOptionsKey, IpcWindowOptions.SET_FULL_SCREEN, true)
```

### `__file_options__` — 路径处理

`invoke` 双向调用，返回 `Promise`，等价于在主进程里调用 `node:path` 的同名方法。

| 枚举 | 值 | 等价方法 |
| --- | --- | --- |
| `BASENAME` | `basename` | `path.basename(path, suffix?)` |
| `DIRNAME` | `dirname` | `path.dirname(path)` |
| `EXTNAME` | `extname` | `path.extname(path)` |
| `JOIN` | `join` | `path.join(...paths)` |
| `PARSE` | `parse` | `path.parse(path)` |
| `RELATIVE` | `relative` | `path.relative(from, to)` |
| `RESOLVE` | `resolve` | `path.resolve(...paths)` |

```ts
const dir = await window.$ipc.invoke(EventKeys.FileOptionsKey, 'dirname', '/a/b/c.txt')
const info = await window.$ipc.invoke(EventKeys.FileOptionsKey, 'parse', '/a/b/c.txt')
```

## 渲染层类型增强

包内提供 `ExpandPreloadIpc`，叠加在预加载的 `$ipc` 类型上即可获得通道与参数的补全和校验：

```ts
// global.d.ts
interface Window {
  $ipc: import('@quiteer/electron-preload').PreloadIpc & import('@quiteer/electron-ipc/web').ExpandPreloadIpc
}
```

之后写错通道或漏传参数都会直接报错：

```ts
window.$ipc.send('__window_options__', 'destroy') // ✅
window.$ipc.invoke('__file_options__', 'join', '/', '/experiment') // ✅
window.$ipc.send('__window_options__', 'not-exist') // ❌ 类型报错
```

## 与 `@quiteer/electron-browser` 配合

本包按 `event.sender` 定位窗口，若你还需要按名管理窗口，可在自己的业务通道里用 browser 的仓库反查来源：

```ts
import { ipcMain } from 'electron'
import { windows } from '@quiteer/electron-browser'

ipcMain.on('custom', (event) => {
  const controller = windows.store.fromWebContents(event.sender)
  controller?.target.webContents.send('custom:reply', controller.name)
})
```

## API

`Ipc` 是单例，直接取用即可。

| 成员 | 说明 |
| --- | --- |
| `Ipc.init()` | 注册两个内置通道的监听与处理器 |
| `Ipc.destroy()` | 注销监听与处理器，应用退出前或热重载时调用 |

## 注意事项

- 只需在主进程 `app.whenReady()` 之后 `init()`；重复 `init()` 会叠加 `ipcMain.on` 监听，建议与 `destroy()` 成对使用。
- 窗口类操作只作用于发起调用的窗口，渲染进程无法指定其他窗口——这是刻意的约束。
- 通道常量统一走 `EventKeys`，不要手写字符串，避免拼写漂移。
- 包为 ESM-only，主进程需使用 ESM 或交由打包器处理。
