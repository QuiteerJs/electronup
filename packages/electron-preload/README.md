# @quiteer/electron-preload

Electron 预加载脚本：导入即拿到脚本路径，一行接入 `webPreferences.preload`，并在渲染进程暴露 `$ipc` / `$webFrame`（可选 `$clipboard`）三组已收敛的 API。

比手写 `contextBridge` 省事，也比直接开 `nodeIntegration` 安全——暴露面固定、不含任何 `require`、`$ipc` 只放行白名单内的通道，并且在 `sandbox: true` 下全部可用。

> 从 2.x 升级请看 [升级指南](https://github.com/QuiteerJs/electron-modules/blob/main/docs/migration.md#electron-preload-2x--30)：3.0 起业务通道必须加进白名单，`$clipboard` 需显式开启。

## 安装

```bash
pnpm add @quiteer/electron-preload
```

## 快速开始

推荐用主进程入口 `createPreload()` 声明业务通道白名单，返回值直接展开进 `webPreferences`：

```ts
import { BrowserWindow } from 'electron';
import { createPreload } from '@quiteer/electron-preload/main';

const win = new BrowserWindow({
  width: 800,
  height: 600,
  webPreferences: {
    sandbox: true,
    ...createPreload({
      channels: {
        send: ['app:quit'],
        invoke: ['user:*'], // * 结尾按前缀匹配
        on: ['download:progress'],
      },
      clipboard: true, // 需要 $clipboard 时开启
    }),
  },
});
```

不需要业务通道时，也可以只用默认导出的脚本路径（此时只放行 `@quiteer/electron-ipc` 的内置通道，不暴露 `$clipboard`）：

```ts
import preloadPath from '@quiteer/electron-preload';

new BrowserWindow({ webPreferences: { sandbox: true, preload: preloadPath } });
```

CommonJS 主进程下一致：

```js
const { createPreload } = require('@quiteer/electron-preload/main');
const preloadPath = require('@quiteer/electron-preload');
```

渲染进程里直接使用：

```ts
window.$ipc.send('app:quit');
const user = await window.$ipc.invoke('user:get', 1);
window.$webFrame.setZoomFactor(1.2);

await window.$clipboard.writeText('hello');
const text = await window.$clipboard.readText();
```

## `createPreload(options)`

| 选项              | 默认值  | 说明                                                                                                          |
| ----------------- | ------- | ------------------------------------------------------------------------------------------------------------- |
| `channels.send`   | `[]`    | `$ipc.send` / `$ipc.sendSync` 可用的通道                                                                      |
| `channels.invoke` | `[]`    | `$ipc.invoke` 可用的通道                                                                                      |
| `channels.on`     | `[]`    | `$ipc.on` / `$ipc.once` / `$ipc.removeAllListeners` 可用的通道                                                |
| `builtinChannels` | `true`  | 是否放行 `@quiteer/electron-ipc` 的内置通道（`__window_options__` 用于 send，`__file_options__` 用于 invoke） |
| `clipboard`       | `false` | 是否暴露 `$clipboard`；开启时会在主进程注册剪贴板处理器（幂等）                                               |

返回 `{ preload, additionalArguments }`。白名单经 `additionalArguments` 交给预加载脚本，页面无法篡改；若你自己也要传 `additionalArguments`，请与返回值合并而不是覆盖。

白名单条目以 `*` 结尾时按前缀匹配，如 `'user:*'` 放行 `user:get`、`user:list`。不在白名单内的调用会直接抛错（`invoke` 返回被拒绝的 `Promise`），错误信息会提示去 `createPreload({ channels })` 里声明。

主进程入口还导出：

| 导出                         | 说明                                   |
| ---------------------------- | -------------------------------------- |
| `preloadPath`                | 预加载脚本的绝对路径，与包默认导出相同 |
| `registerClipboardHandler()` | 手动注册剪贴板处理器，重复调用无副作用 |
| `removeClipboardHandler()`   | 注销剪贴板处理器，之后可再次注册       |

## 暴露的 API

### `$ipc`

| 方法                           | 说明                                         |
| ------------------------------ | -------------------------------------------- |
| `send(channel, ...args)`       | 单向发送                                     |
| `sendSync(channel, ...args)`   | 同步发送，阻塞渲染进程，非必要请用 `invoke`  |
| `invoke(channel, ...args)`     | 双向调用，返回 `Promise`                     |
| `on(channel, listener)`        | 监听主进程推送，**返回取消监听的函数**       |
| `once(channel, listener)`      | 监听一次，同样返回取消函数                   |
| `removeAllListeners(channel?)` | 移除经 `$ipc` 注册的监听，不传通道则清空全部 |

```ts
const off = window.$ipc.on('progress', (_event, value) => render(value));
// 组件卸载时
off();
```

回调的第一个参数是空对象占位，不是原生 `IpcRendererEvent`：原生事件的 `sender` 就是 `ipcRenderer` 本身，透出去等于把整个 `ipcRenderer` 交给页面（Electron 安全指南明确禁止）。参数位置保持不变，`(_event, ...args)` 的写法无需改动。

> 不提供 `removeListener(channel, listener)`：页面函数每次跨越 `contextBridge` 都会变成新的代理，按引用移除永远对不上，请使用 `on` / `once` 返回的取消函数。

### `$clipboard`

需 `createPreload({ clipboard: true })` 才会暴露。沙箱预加载脚本里拿不到 Electron 的 `clipboard` 模块，因此全部经内部通道转发到主进程执行，返回值都是 `Promise`。只接受主 frame 的调用，子 frame（含第三方 iframe）会被拒绝。

| 方法                     | 说明                                        |
| ------------------------ | ------------------------------------------- |
| `clear(type?)`           | 清空                                        |
| `has(mimetype, type?)`   | 是否存在指定 MIME 类型的内容                |
| `read(type?)`            | 读取全部条目，返回 `PreloadClipboardData[]` |
| `readText(type?)`        | 读取文本                                    |
| `write(data, type?)`     | 写入 `PreloadClipboardData[]`               |
| `writeText(text, type?)` | 写入文本                                    |

`type` 可选 `'clipboard'`（默认）或 `'selection'`，后者仅 Linux 生效，其他平台回落到系统剪贴板。

原生 `ClipboardItem` 是类实例，跨不过 IPC 与 `contextBridge`，这里换成普通对象 `PreloadClipboardData`：键为 MIME 类型，`text/*` 的值为字符串，其他二进制格式为 `Uint8Array`，`electron application/bookmark` 为 `{ title, url }`。

```ts
await window.$clipboard.write([{ 'text/plain': 'hi', 'text/html': '<b>hi</b>' }]);
const [item] = await window.$clipboard.read();
```

### `$webFrame`

| 方法                                        | 说明                     |
| ------------------------------------------- | ------------------------ |
| `setZoomFactor(factor)` / `getZoomFactor()` | 缩放倍数，`1` 为原始比例 |
| `setZoomLevel(level)` / `getZoomLevel()`    | 缩放等级                 |
| `insertText(text)`                          | 向焦点元素插入文本       |
| `getResourceUsage()`                        | 资源占用                 |
| `clearCache()`                              | 清空缓存                 |

隔离世界执行脚本（`executeJavaScriptInIsolatedWorld` / `setIsolatedWorldInfo`）会让页面绕开 `contextIsolation`，`executeJavaScript` 的 `userGesture` 可伪造用户手势，取关联 frame 的接口返回的 `WebFrame` 跨不过 `contextBridge`，这些都不再暴露。

## 类型提示

在渲染层声明全局类型即可获得补全：

```ts
// global.d.ts
interface Window {
  $ipc: import('@quiteer/electron-preload').PreloadIpc;
  $clipboard?: import('@quiteer/electron-preload').PreloadClipboard; // 开启 clipboard 时
  $webFrame: import('@quiteer/electron-preload').PreloadWebFrame;
}
```

配合 [@quiteer/electron-ipc](https://github.com/QuiteerJs/electron-modules/tree/main/packages/ipc) 使用时，把它的通道类型一起叠上：

```ts
interface Window {
  $ipc: import('@quiteer/electron-ipc/web').WithIpcChannels<
    import('@quiteer/electron-preload').PreloadIpc
  >;
}
```

## 注意事项

- 产物是 CommonJS：开启 `sandbox` 时预加载脚本不支持 ESM，因此本包固定输出 `.cjs`，请勿改为 ESM 引用。
- 走的是 `contextBridge`，参数与返回值必须可序列化——函数、`Symbol`、类实例都传不过去，这也是 `executeJavaScript` 不支持回调参数的原因。
- 暴露的 API 是刻意收敛过的：需要更多能力请自行在 `ipcMain` 上加通道并加进白名单，而不是关闭 `sandbox`。
- `$clipboard` 依赖 Electron 44 的异步剪贴板 API，本包的 `peerDependencies` 因此要求 `electron >= 44`。
- 脚本路径在包安装位置下，打包时请确认 `node_modules` 内资源已随主进程产物一起分发（或用 `--extraResource` 等方式处理）。
