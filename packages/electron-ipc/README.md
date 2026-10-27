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
import { Ipc } from '@quiteer/electron-ipc';
import { app } from 'electron';

app.whenReady().then(() => {
  Ipc.init();
});
```

渲染进程里按枚举发消息（需配合预加载脚本暴露的 `window.$ipc`）：

```ts
import { EventKeys, IpcWindowOptions } from '@quiteer/electron-ipc/web';

// 最大化当前窗口
window.$ipc.send(EventKeys.WindowOptionsKey, IpcWindowOptions.MAXIMIZE);

// 拼路径, 返回 Promise
const full = await window.$ipc.invoke(EventKeys.FileOptionsKey, 'join', '/user', 'local');
```

## 内置通道

### `__window_options__` — 窗口控制

`send` 单向发送，操作对象是**发起调用的窗口自身**。

| 枚举                   | 值                     | 说明                                   |
| ---------------------- | ---------------------- | -------------------------------------- |
| `DESTROY`              | `destroy`              | 销毁窗口，触发 `closed`                |
| `CLOSE`                | `close`                | 尝试关闭，等同点关闭按钮（页面可拦截） |
| `SHOW`                 | `show`                 | 显示                                   |
| `HIDE`                 | `hide`                 | 隐藏                                   |
| `FOCUS`                | `focus`                | 获取焦点                               |
| `BLUR`                 | `blur`                 | 失去焦点                               |
| `MAXIMIZE`             | `maximize`             | 最大化                                 |
| `UNMAXIMIZE`           | `unmaximize`           | 取消最大化                             |
| `MINIMIZE`             | `minimize`             | 最小化                                 |
| `RESTORE`              | `restore`              | 从最小化还原                           |
| `RELOAD`               | `reload`               | 刷新                                   |
| `SET_FULL_SCREEN`      | `setFullScreen`        | 全屏，附 `flag: boolean`               |
| `SET_TITLE`            | `setTitle`             | 改标题，附 `title: string`             |
| `FLASH_FRAME`          | `flashFrame`           | 任务栏闪烁，附 `flag: boolean`         |
| `SWITCH_FOCUS`         | `switch-focus`         | 聚焦 / 失焦互切                        |
| `SWITCH_MAX`           | `switch-max`           | 最大化 / 还原互切                      |
| `SWITCH_MIN`           | `switch-min`           | 最小化 / 还原互切                      |
| `SWITCH_FULL`          | `switch-full`          | 全屏 / 退出全屏互切                    |
| `SWITCH_RESIZABLE`     | `switch-resizable`     | 可否调整尺寸互切                       |
| `SWITCH_MOVABLE`       | `switch-movable`       | 可否移动互切（Linux 无效）             |
| `SWITCH_MINIMIZABLE`   | `switch-minimizable`   | 可否最小化互切（Linux 无效）           |
| `SWITCH_MAXIMIZABLE`   | `switch-maximizable`   | 可否最大化互切（Linux 无效）           |
| `SWITCH_ALWAYS_ON_TOP` | `switch-always-on-top` | 是否置顶互切                           |

带参数的调用：

```ts
window.$ipc.send(EventKeys.WindowOptionsKey, IpcWindowOptions.SET_TITLE, '新标题');
window.$ipc.send(EventKeys.WindowOptionsKey, IpcWindowOptions.SET_FULL_SCREEN, true);
```

### `__file_options__` — 路径处理

`invoke` 双向调用，返回 `Promise`，等价于在主进程里调用 `node:path` 的同名方法。

| 枚举       | 值         | 等价方法                       |
| ---------- | ---------- | ------------------------------ |
| `BASENAME` | `basename` | `path.basename(path, suffix?)` |
| `DIRNAME`  | `dirname`  | `path.dirname(path)`           |
| `EXTNAME`  | `extname`  | `path.extname(path)`           |
| `JOIN`     | `join`     | `path.join(...paths)`          |
| `PARSE`    | `parse`    | `path.parse(path)`             |
| `RELATIVE` | `relative` | `path.relative(from, to)`      |
| `RESOLVE`  | `resolve`  | `path.resolve(...paths)`       |

```ts
const dir = await window.$ipc.invoke(EventKeys.FileOptionsKey, 'dirname', '/a/b/c.txt');
const info = await window.$ipc.invoke(EventKeys.FileOptionsKey, 'parse', '/a/b/c.txt');
```

## 类型安全的 IPC 契约

业务通道不再是「字符串 + `unknown`」：在一个共享文件里定义契约，主进程 handler、渲染层 client、preload 通道白名单都从它推导，任何一端写错通道名、参数或返回值都会直接类型报错。

### 1. 定义契约（主进程与渲染层共享）

```ts
// shared/ipc.ts —— 只依赖 /web 入口, 主进程、preload、渲染层都能引用
import { channel, defineContract } from '@quiteer/electron-ipc/web';

export const api = defineContract({
  // 渲染层 → 主进程, 有返回值
  invoke: {
    'user:get': channel<(id: string) => User>(),
  },
  // 渲染层 → 主进程, 单向
  send: {
    'app:log': channel<(msg: string) => void>(),
  },
  // 主进程 → 渲染层推送
  on: {
    'download:progress': channel<(percent: number) => void>(),
  },
});
```

`channel<F>()` 用函数签名描述参数与返回值，运行时只是一个空占位。

### 2. 主进程实现

```ts
import { createEmitter, handleContract } from '@quiteer/electron-ipc';
import { api } from '../shared/ipc';

const dispose = handleContract(api, {
  invoke: {
    'user:get': (ctx, id) => db.users.find(id), // 可返回 Promise
  },
  send: {
    'app:log': (ctx, msg) => logger.info(ctx.window?.id, msg),
  },
});

const emitter = createEmitter(api);
emitter.emit(win, 'download:progress', 0.5); // 推给某个窗口 / webContents
emitter.broadcast('download:progress', 1); // 推给全部窗口
```

- 契约里每个 `invoke` / `send` 通道都必须实现，漏写、多写或返回值不符都会类型报错；运行时漏实现也会在注册前抛错，不会留下注册了一半的通道。
- handler 的第一个参数 `ctx` 与 Electron 的 `(event, ...args)` 约定一致：`{ event, sender, window }`，`window` 是发起调用的 `BrowserWindow`。
- 返回的 `dispose()` 注销本次注册的全部通道，可用于热重载。

### 3. 渲染层调用

```ts
import { createClient } from '@quiteer/electron-ipc/web';
import { api } from '../shared/ipc';

const client = createClient(api); // 默认使用 window.$ipc, 也可显式传入

const user = await client.invoke('user:get', '1'); // Promise<User>
client.send('app:log', 'hello');
const off = client.on('download:progress', (percent) => {}); // 回调不带 event
```

契约之外的通道名在运行时同样会被拒绝，`as any` 也绕不过去。

### 4. 生成 preload 通道白名单

```ts
import { builtinChannels, channelsOf } from '@quiteer/electron-ipc/web';
import { api } from '../shared/ipc';

api.channels; // { send: ['app:log'], invoke: ['user:get'], on: ['download:progress'] }

// 多个契约 + 本包内置通道合并去重, 交给 preload 的通道白名单
const channels = channelsOf(api, builtinChannels);
```

白名单形状为 `{ send, invoke, on }`，与 `@quiteer/electron-preload` 的通道白名单配置一一对应，不需要再手写一遍。

### 参数校验（可选）

渲染层的参数在主进程边界不可信。`channel` 接受任意 [Standard Schema](https://standardschema.dev)（zod / valibot / arktype 等），schema 的输出类型必须与签名参数一致：

```ts
import { z } from 'zod';

channel<(id: string) => User>({ args: z.tuple([z.string().uuid()]) });
```

校验在主进程执行：失败时 `invoke` 以错误拒绝，`send` 丢弃并 `console.error`；handler 拿到的是校验后的值。

### 来源校验

`handleContract` 默认只接受**顶层 frame** 的调用（`isMainFrame`），页面里嵌入的第三方 iframe 无法调用契约通道。需要放开时自行传入：

```ts
handleContract(api, handlers, {
  validateSender: (event) => new URL(event.senderFrame!.url).origin === 'https://app.example.com',
});
```

## 渲染层类型增强

包内提供 `WithIpcChannels`，把内置通道的精确签名叠加到预加载的 `$ipc` 类型上：

```ts
// global.d.ts
interface Window {
  $ipc: import('@quiteer/electron-ipc/web').WithIpcChannels<
    import('@quiteer/electron-preload').PreloadIpc
  >;
}
```

之后写错操作名或漏传参数都会直接报错，业务自定义通道照常使用：

```ts
window.$ipc.send('__window_options__', 'destroy'); // ✅
window.$ipc.invoke('__file_options__', 'join', '/', '/experiment'); // ✅ Promise<string>
window.$ipc.send('my-channel', { id: 1 }); // ✅ 业务通道不受影响
window.$ipc.send('__window_options__', 'not-exist'); // ❌ 类型报错
window.$ipc.send('__window_options__', 'setTitle'); // ❌ 漏传 title
```

> 旧写法 `PreloadIpc & ExpandPreloadIpc` 不会报错：`PreloadIpc` 的宽松签名 `(channel: string, ...args)` 会兜住所有调用。`ExpandPreloadIpc` 仍然导出，但请改用 `WithIpcChannels`。

## 与 `@quiteer/electron-browser` 配合

本包按 `event.sender` 定位窗口，若你还需要按名管理窗口，可在自己的业务通道里用 browser 的仓库反查来源：

```ts
import { ipcMain } from 'electron';
import { windows } from '@quiteer/electron-browser';

ipcMain.on('custom', (event) => {
  const controller = windows.store.fromWebContents(event.sender);
  controller?.target.webContents.send('custom:reply', controller.name);
});
```

## API

`Ipc` 是模块级单例，直接取用即可。

| 成员              | 说明                                             |
| ----------------- | ------------------------------------------------ |
| `Ipc.init()`      | 注册两个内置通道的监听与处理器，重复调用无副作用 |
| `Ipc.destroy()`   | 注销本包注册的监听与处理器，之后可再次 `init()`  |
| `Ipc.initialized` | 当前是否已注册                                   |

契约相关：

| 导出                                  | 入口     | 说明                                                   |
| ------------------------------------- | -------- | ------------------------------------------------------ |
| `defineContract(spec)`                | 两者皆有 | 定义契约，返回值带 `channels` 白名单                   |
| `channel<F>(options?)`                | 两者皆有 | 声明单个通道，可选 `args` 参数校验                     |
| `channelsOf(...sources)`              | 两者皆有 | 合并多个契约 / 白名单并去重                            |
| `builtinChannels`                     | 两者皆有 | `Ipc.init()` 注册的内置通道白名单                      |
| `handleContract(api, handlers, opts)` | 主入口   | 注册主进程 handler，返回 `dispose()`                   |
| `createEmitter(api)`                  | 主入口   | 按契约推送：`emit(target, channel, ...)` / `broadcast` |
| `isMainFrame(event)`                  | 主入口   | 默认的来源校验                                         |
| `createClient(api, bridge?)`          | `/web`   | 渲染层 client：`invoke` / `send` / `on` / `once`       |

主入口同时导出 `EventKeys`、`IpcWindowOptions`、`IpcFileOptions`，主进程里需要引用通道名时不必再走 `/web`。

## 注意事项

- 只需在主进程 `app.whenReady()` 之后 `init()`；`init()` 是幂等的，热重载时可先 `destroy()` 再 `init()`。
- `destroy()` 只移除本包自己的监听，业务方挂在同名通道上的回调不受影响。
- 渲染层传入未知操作时：窗口通道静默忽略，路径通道 `invoke` 会以错误拒绝。
- 窗口类操作只作用于发起调用的窗口，渲染进程无法指定其他窗口——这是刻意的约束。
- 通道常量统一走 `EventKeys`，不要手写字符串，避免拼写漂移。
- 包为 ESM-only：主进程需使用 ESM，或交由打包器（electron-builder / vite / esbuild）一起编译。CJS 主进程直接 `require()` 会抛 `ERR_PACKAGE_PATH_NOT_EXPORTED`。
