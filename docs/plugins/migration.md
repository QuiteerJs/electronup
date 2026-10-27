# 升级指南

本文覆盖两次需要动手的升级：

- [`@quiteer/electron-preload` 2.x → 3.0](#electron-preload-2x--30)：**破坏性变更**，业务通道必须显式加白名单。
- [`@quiteer/electron-ipc` 3.1 → 3.2](#electron-ipc-31--32)：API 向后兼容，但内置通道开始校验调用来源；另外新增了类型安全的 IPC 契约，可以顺手迁过去。

两个包通常一起用，建议同时升级，按 [一起升级的推荐顺序](#一起升级的推荐顺序) 走一遍即可。完整的逐条变更见各包的 `CHANGELOG.md`，可运行的完整示例见 [`playground/basic`](../playground/basic)。

## electron-preload 2.x → 3.0

### 环境要求

| 项目       | 要求                                                  |
| ---------- | ----------------------------------------------------- |
| `electron` | `>= 44`（新增 `peerDependencies`，`$clipboard` 依赖） |
| Node.js    | `>= 20`                                               |

### 1. 业务通道需要加白名单（必改）

3.0 起 `$ipc` 只放行白名单内的通道。默认白名单只有 `@quiteer/electron-ipc` 的两个内置通道（`__window_options__` / `__file_options__`），**其余通道一律抛错**，`invoke` 返回被拒绝的 `Promise`：

```text
[electron-preload] 通道 "user:get" 未在 invoke 白名单中, 请在 createPreload({ channels }) 中声明
```

白名单由主进程决定：新的主进程入口 `@quiteer/electron-preload/main` 提供 `createPreload()`，返回 `{ preload, additionalArguments }`，直接展开进 `webPreferences`。

```ts
// 2.x
import preloadPath from '@quiteer/electron-preload';

new BrowserWindow({
  webPreferences: { sandbox: true, preload: preloadPath },
});
```

```ts
// 3.0
import { createPreload } from '@quiteer/electron-preload/main';

new BrowserWindow({
  webPreferences: {
    sandbox: true,
    ...createPreload({
      channels: {
        send: ['app:quit', 'app:log'], // $ipc.send / $ipc.sendSync
        invoke: ['user:*'], // $ipc.invoke, * 结尾按前缀匹配
        on: ['download:progress'], // $ipc.on / $ipc.once / $ipc.removeAllListeners
      },
    }),
  },
});
```

怎么找出要声明的通道：在渲染层代码里搜 `$ipc.send(` / `$ipc.sendSync(` / `$ipc.invoke(` / `$ipc.on(` / `$ipc.once(`，按方法归到对应的组里。主进程侧对应的是 `ipcMain.on`（send）、`ipcMain.handle`（invoke）和 `webContents.send`（on）。

注意事项：

- 白名单经 `additionalArguments` 传给预加载脚本，页面无法篡改。**如果你自己也在传 `additionalArguments`，要合并而不是覆盖**：

  ```ts
  const preload = createPreload({ channels });
  new BrowserWindow({
    webPreferences: {
      ...preload,
      additionalArguments: [...preload.additionalArguments, '--my-flag'],
    },
  });
  ```

- 用了 `@quiteer/electron-ipc` 的契约时不必手写白名单，`channels: channelsOf(api)` 即可，见 [迁到 IPC 契约](#2-可选迁到-ipc-契约)。
- 内置通道默认放行；不用 `@quiteer/electron-ipc` 的项目可以传 `builtinChannels: false` 把它们也关掉。
- 只用内置通道、没有业务通道的项目可以继续用默认导出的 `preloadPath`，行为不变。
- `@quiteer/electron-browser` 的 `windows.create()` 同样把 `createPreload()` 的结果放进 `webPreferences`，它的安全默认值会与之合并。

### 2. `$clipboard` 改为按需开启（用到时必改）

2.x 的 `$clipboard` 在 `sandbox: true` 下其实不可用（沙箱预加载里没有 `clipboard` 模块，调用即报错）。3.0 改为经主进程实现，并且默认不暴露：

```ts
createPreload({ clipboard: true }); // 同时会在主进程注册剪贴板处理器, 重复调用无副作用
```

不经 `createPreload` 的写法可以手动调用 `registerClipboardHandler()`，但只有 `createPreload({ clipboard: true })` 才会让预加载脚本暴露 `window.$clipboard`。

类型与数据结构也随之调整：

| 2.x                                     | 3.0                                                                                       |
| --------------------------------------- | ----------------------------------------------------------------------------------------- |
| `window.$clipboard` 总是存在            | 只在开启时存在，全局类型建议声明为可选 `$clipboard?`                                      |
| `read()` / `write()` 用 `ClipboardItem` | 改为普通对象 `PreloadClipboardData`：`{ [mime]: string \| Uint8Array \| { title, url } }` |
| —                                       | 各方法末位新增可选 `type: 'clipboard' \| 'selection'`（`selection` 仅 Linux 生效）        |
| `clear(type)` 丢掉了 `type`             | 已修复                                                                                    |

```ts
// 2.x (实际在 sandbox 下跑不通)
await window.$clipboard.write([new ClipboardItem({ 'text/plain': blob })]);

// 3.0
await window.$clipboard?.write([{ 'text/plain': 'hi', 'text/html': '<b>hi</b>' }]);
const [item] = (await window.$clipboard?.read()) ?? [];
```

剪贴板处理器只接受主 frame 的调用，页面里嵌的 iframe 读写剪贴板会被拒绝。

### 3. `$webFrame` 收窄（用到时必改）

以下成员已移除：

| 移除的成员                                                                               | 原因                                     | 替代做法                                                                     |
| ---------------------------------------------------------------------------------------- | ---------------------------------------- | ---------------------------------------------------------------------------- |
| `executeJavaScript`                                                                      | `userGesture` 可伪造用户手势             | 页面自己的代码直接执行；确需主进程注入时用 `webContents.executeJavaScript()` |
| `executeJavaScriptInIsolatedWorld` / `setIsolatedWorldInfo`                              | 让页面绕开 `contextIsolation`            | 需要隔离世界能力的逻辑放进你自己的预加载脚本或主进程                         |
| `getFrameForSelector` / `firstChild` / `nextSibling` / `opener` / `parent` / `routingId` | 返回的 `WebFrame` 跨不过 `contextBridge` | 主进程用 `webContents.mainFrame.frames` / `framesInSubtree` 遍历 frame       |

保留的成员不变：`setZoomFactor` / `getZoomFactor` / `setZoomLevel` / `getZoomLevel` / `insertText` / `getResourceUsage` / `clearCache`。

### 4. `$ipc.removeAllListeners()` 只清自己注册的监听

3.0 起它只移除经 `$ipc` 注册的监听，不再连带清掉其他预加载代码挂在 `ipcRenderer` 上的监听。依赖旧行为「一键清空所有监听」的代码一般不需要改；如果你恰好依赖它清掉别处的监听，请改为在那份代码里自行注销。

### 5. 不能再深引用 `dist/*`

`package.json` 新增了 `exports`，只开放 `.`、`./main` 与 `./package.json`：

```ts
// 2.x: 不再可用, 会报 ERR_PACKAGE_PATH_NOT_EXPORTED
require.resolve('@quiteer/electron-preload/dist/preload.cjs');

// 3.0: 二选一
import preloadPath from '@quiteer/electron-preload';
import { preloadPath } from '@quiteer/electron-preload/main';
```

### 6. 全局类型

```ts
// global.d.ts
interface Window {
  $ipc: import('@quiteer/electron-ipc/web').WithIpcChannels<
    import('@quiteer/electron-preload').PreloadIpc
  >;
  $webFrame: import('@quiteer/electron-preload').PreloadWebFrame;
  $clipboard?: import('@quiteer/electron-preload').PreloadClipboard; // 开启 clipboard 时才有
}
```

### 自查清单

- [ ] `electron` 升到 `>= 44`
- [ ] 所有创建窗口的地方改用 `createPreload()`，且声明了全部业务通道
- [ ] 自定义的 `additionalArguments` 已与 `createPreload()` 的返回值合并
- [ ] 用到 `$clipboard` 的窗口传了 `clipboard: true`，`ClipboardItem` 换成普通对象
- [ ] 没有再调用已移除的 `$webFrame` 成员
- [ ] 没有深引用 `@quiteer/electron-preload/dist/*`
- [ ] 打开每个窗口跑一遍主要流程，控制台没有「未在 xxx 白名单中」的报错

## electron-ipc 3.1 → 3.2

3.2 没有删改任何 API，现有代码可以直接升级。需要留意的是一处**行为变化**，以及一个推荐迁移的新能力。

### 环境要求

| 项目       | 要求                               |
| ---------- | ---------------------------------- |
| `electron` | `>= 30`（新增 `peerDependencies`） |
| Node.js    | `>= 20`                            |

### 1. 内置通道开始校验调用来源（行为变化）

`Ipc.init()` 注册的两个内置通道默认**只接受主 frame 的调用**：

- 子 frame（包括页面里嵌的第三方 iframe）发来的窗口操作会被**静默忽略**；
- 子 frame 调用路径通道 `__file_options__` 会**以错误拒绝**：`[electron-ipc] 调用来源未通过校验`；
- frame 已导航或销毁（`senderFrame` 为 `null`）时同样拒绝。

绝大多数应用只在主 frame 里调用，不需要改任何代码。建议顺手限定页面来源：

```ts
Ipc.init({ allowedOrigins: ['file://', 'http://localhost:5173'] });
```

`file://` 按协议匹配，其余按 `URL.origin` 精确匹配。开发时接 dev server，记得把它的 origin 也加上，否则调用会被拒。

确实需要让 iframe 调用内置通道时，用 `validateSender` 自定义规则。**它会完全替代默认校验，包括主 frame 检查**，请自己把关：

```ts
Ipc.init({
  validateSender: (event) => {
    const url = event.senderFrame?.url ?? '';
    return url.startsWith('file://') || url.startsWith('https://widgets.example.com/');
  },
});
```

`Ipc.init()` 是幂等的，以首次调用的选项为准；要换选项请先 `Ipc.destroy()` 再 `Ipc.init(newOptions)`。

### 2. （可选）迁到 IPC 契约

3.2 新增了端到端类型安全的契约：一份定义同时驱动主进程 handler、渲染层 client 和 preload 白名单。原来「通道名字符串 + `unknown` 参数」的写法照常可用，可以按通道逐个迁移。

**迁移前**：三处各写一遍通道名，类型全靠手动对齐。

```ts
// main
ipcMain.handle('user:get', (event, id: string) => db.users.find(id));
ipcMain.on('app:log', (event, msg: string) => logger.info(msg));
win.webContents.send('download:progress', 0.5);

// createPreload
createPreload({
  channels: { invoke: ['user:get'], send: ['app:log'], on: ['download:progress'] },
});

// renderer
const user = (await window.$ipc.invoke('user:get', '1')) as User;
window.$ipc.on('download:progress', (_event, percent) => render(percent as number));
```

**迁移后**：

```ts
// shared/ipc.ts —— 只依赖 /web 入口, 主进程、preload、渲染层都能引用
import { channel, defineContract } from '@quiteer/electron-ipc/web';

export const api = defineContract({
  invoke: { 'user:get': channel<(id: string) => User>() },
  send: { 'app:log': channel<(msg: string) => void>() },
  on: { 'download:progress': channel<(percent: number) => void>() },
});
```

```ts
// main
import { channelsOf, createEmitter, handleContract, Ipc } from '@quiteer/electron-ipc';
import { createPreload } from '@quiteer/electron-preload/main';
import { api } from '../shared/ipc';

const allowedOrigins = ['file://'];
Ipc.init({ allowedOrigins });
handleContract(
  api,
  {
    invoke: { 'user:get': (ctx, id) => db.users.find(id) },
    send: { 'app:log': (ctx, msg) => logger.info(ctx.window?.id, msg) },
  },
  { allowedOrigins },
);

const emitter = createEmitter(api);
emitter.emit(win, 'download:progress', 0.5);

new BrowserWindow({
  webPreferences: { ...createPreload({ channels: channelsOf(api) }) },
});
```

```ts
// renderer
import { createClient } from '@quiteer/electron-ipc/web';
import { api } from '../shared/ipc';

const client = createClient(api);
const user = await client.invoke('user:get', '1'); // Promise<User>
const off = client.on('download:progress', (percent) => render(percent));
```

迁移时容易踩的点：

| 变化                     | 说明                                                                                                                        |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| handler 第一个参数       | 由 `event` 改为 `ctx = { event, sender, window }`，原生事件在 `ctx.event` 上                                                |
| 渲染层监听回调           | `client.on` 的回调**不带 event**，直接是参数：`(percent) => {}`，而 `$ipc.on` 是 `(_event, percent) => {}`                  |
| 同名通道不能重复注册     | 迁过去的通道要删掉原来的 `ipcMain.handle`，否则 `handleContract` 抛 “Attempted to register a second handler” 并回滚本次注册 |
| 契约里的通道必须全部实现 | 漏写 `invoke` / `send` 的 handler 会类型报错，运行时也会在注册前抛错                                                        |
| 契约通道同样校验来源     | `handleContract` 的第三个参数与 `Ipc.init()` 相同，默认只接受主 frame；建议两处传同一份 `allowedOrigins`                    |
| 契约外的通道名           | `createClient` 在运行时也会拒绝，`as any` 绕不过去                                                                          |
| 多个契约                 | `channelsOf(api, settingsApi)` 合并去重；关掉 `builtinChannels` 时可再合并本包导出的 `builtinChannels`                      |

需要在主进程边界校验参数时，给 `channel` 传任意 [Standard Schema](https://standardschema.dev)（zod / valibot / arktype 等）：

```ts
channel<(id: string) => User>({ args: z.tuple([z.string().uuid()]) });
```

校验失败时 `invoke` 以错误拒绝，`send` 丢弃并 `console.error`。

### 3. 类型增强改用 `WithIpcChannels`（3.1 已提供）

如果你还在用 `PreloadIpc & ExpandPreloadIpc`，它其实不会报错（`PreloadIpc` 的宽松签名兜住了所有调用），请换成：

```ts
interface Window {
  $ipc: import('@quiteer/electron-ipc/web').WithIpcChannels<
    import('@quiteer/electron-preload').PreloadIpc
  >;
}
```

### 自查清单

- [ ] 确认没有在 iframe 里调用内置通道；有的话用 `validateSender` 放行
- [ ] `Ipc.init()` 传了 `allowedOrigins`，开发环境的 dev server origin 也在内
- [ ] （可选）业务通道迁到 `defineContract`，并删掉对应的旧 `ipcMain.handle` / `ipcMain.on`
- [ ] （可选）preload 白名单改为 `channelsOf(api)`

## 一起升级的推荐顺序

1. 升级依赖：`electron >= 44`、`@quiteer/electron-preload@^3`、`@quiteer/electron-ipc@^3.2`。
2. 主进程 `app.whenReady()` 之后调用 `Ipc.init({ allowedOrigins })`。
3. 新建共享契约文件，把业务通道搬进去，主进程用 `handleContract` 实现、`createEmitter` 推送，同时删掉旧的 `ipcMain.handle` / `ipcMain.on`。
4. 所有窗口的 `webPreferences` 改为 `...createPreload({ channels: channelsOf(api), clipboard: 用到剪贴板时 })`。
5. 渲染层改用 `createClient(api)`；还没迁的通道继续走 `window.$ipc`，但要记得出现在白名单里。
6. 更新 `global.d.ts`，然后逐个窗口点一遍。

## 常见报错

| 报错                                                       | 原因与处理                                                                          |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `[electron-preload] 通道 "x" 未在 send/invoke/on 白名单中` | 通道没加进 `createPreload({ channels })`；用契约时检查是否漏了 `channelsOf(api)`    |
| `window.$clipboard` 是 `undefined`                         | 创建窗口时没传 `createPreload({ clipboard: true })`                                 |
| `[electron-preload] 只允许主 frame 访问剪贴板`             | 剪贴板在 iframe 里调用，挪到主 frame                                                |
| `[electron-ipc] 调用来源未通过校验`                        | 路径通道来自子 frame 或不在 `allowedOrigins` 内的页面                               |
| `[electron-ipc] 拒绝来自不可信 frame 的调用: x`            | 契约通道同上，检查 `handleContract` 的第三个参数                                    |
| 窗口操作没反应、也没报错                                   | 窗口通道对未通过校验的调用静默忽略，排查方法同上                                    |
| `Attempted to register a second handler for 'x'`           | 同一通道既有旧的 `ipcMain.handle` 又进了契约，删掉旧的                              |
| `[electron-ipc] 契约通道 invoke:x 未实现处理函数`          | `handleContract` 漏了该通道的 handler                                               |
| `ERR_PACKAGE_PATH_NOT_EXPORTED`（preload）                 | 深引用了 `dist/*`，改用默认导出或 `@quiteer/electron-preload/main` 的 `preloadPath` |
