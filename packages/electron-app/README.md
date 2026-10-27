# @quiteer/electron-app

Electron 应用生命周期样板一行收拢：单实例锁、deep link、macOS activate 重建主窗口、优雅退出。

## 安装

```bash
pnpm add @quiteer/electron-app
```

## 快速开始

在主进程入口**顶层同步调用**（不要放进 `whenReady`，否则会错过 macOS 启动时的 `open-url`）：

```ts
import { setupApp } from '@quiteer/electron-app';
import { windows } from '@quiteer/electron-browser';
import { trays } from '@quiteer/electron-tray';

const lifecycle = setupApp({
  windows,
  mainWindow: 'main',
  createMainWindow: () => windows.create({ name: 'main', width: 1200, height: 800, url }),
  onReady: () => {
    // 菜单 / 托盘 / ipc 等, 在创建主窗口之前执行
  },
  protocols: 'myapp',
  onOpenUrl: (url) => windows.get('main')?.webContents.send('deep-link', url),
  beforeQuit: [() => trays.destroyAll(), () => windows.closeAll()],
});
```

不用 `@quiteer/electron-browser` 也可以：`mainWindow` 传取值函数 `() => mainWin`，或不传（取第一个存活窗口）。

## 做了什么

| 场景            | 行为                                                                               |
| --------------- | ---------------------------------------------------------------------------------- |
| 启动            | 请求单实例锁, 拿不到直接退出; ready 后依次调用 `onReady`、`createMainWindow`       |
| 第二个实例启动  | 还原并聚焦主窗口 (不存在则创建), 分发 argv 里的 deep link, 调用 `onSecondInstance` |
| deep link       | 注册默认协议处理程序; 统一 macOS `open-url` 与 Windows / Linux argv, ready 前缓存  |
| macOS 打开文件  | `open-file` 交给 `onOpenFile`                                                      |
| macOS 点击 Dock | 没有窗口时调用 `createMainWindow`                                                  |
| 所有窗口关闭    | 非 macOS 退出 (`quitOnAllWindowsClosed` 可改)                                      |
| 退出            | 依次执行清理任务, 出错不中断, 超时 (`quitTimeout`, 默认 5s) 强制退出, 然后真正退出 |

## 隐藏到托盘

`isQuitting` 区分「用户点了关闭按钮」和「应用正在退出」：

```ts
const win = windows.create({ name: 'main', url });
win.on('close', (event) => {
  if (!lifecycle.isQuitting) {
    event.preventDefault();
    win.hide();
  }
});

setupApp({ quitOnAllWindowsClosed: false /* ... */ });
```

## API

### `setupApp(options)`

| 选项                     | 说明                                                                      |
| ------------------------ | ------------------------------------------------------------------------- |
| `singleInstance`         | 单实例锁, 默认 `true`; 传对象可设置 `focus: false` 与 `additionalData`    |
| `windows`                | 按名取窗口的对象, 通常是 `@quiteer/electron-browser` 的 `windows`         |
| `mainWindow`             | 主窗口名称 (配合 `windows`) 或取值函数                                    |
| `createMainWindow`       | 创建主窗口                                                                |
| `onReady`                | ready 后、创建主窗口前调用, 可返回 Promise                                |
| `protocols`              | 注册的 scheme, 如 `'myapp'` 或 `['myapp', 'myapp-dev']`                   |
| `onOpenUrl(url, ctx)`    | 收到 deep link, `ctx.source` 为 `launch` / `second-instance` / `open-url` |
| `onOpenFile(path, ctx)`  | 收到要打开的文件 (macOS)                                                  |
| `onSecondInstance(ctx)`  | 第二个实例启动, `ctx` 含 `argv` / `workingDirectory` / `additionalData`   |
| `quitOnAllWindowsClosed` | 所有窗口关闭后是否退出, 默认非 macOS 为 `true`                            |
| `beforeQuit`             | 退出前依次执行的清理任务                                                  |
| `quitTimeout`            | 清理任务总超时, 默认 `5000`                                               |
| `onError(error, phase)`  | 回调出错时调用, 默认 `console.error`                                      |

### 返回的控制器

| 成员                 | 说明                                            |
| -------------------- | ----------------------------------------------- |
| `isPrimary`          | 是否拿到了单实例锁, 为 `false` 时不要再做初始化 |
| `isQuitting`         | 是否已进入退出流程                              |
| `getMainWindow()`    | 取主窗口                                        |
| `focusMainWindow()`  | 还原并聚焦主窗口, 不存在时创建                  |
| `onBeforeQuit(task)` | 追加清理任务, 返回取消函数                      |
| `quit()`             | 退出 (先执行清理任务)                           |
| `dispose()`          | 移除本包注册的全部 app 监听                     |

另外导出 `registerProtocols` / `extractUrls` / `normalizeSchemes` 供单独使用。
