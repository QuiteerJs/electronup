# @quiteer/electron-preload

Electron 预加载脚本：导入即拿到脚本路径，一行接入 `webPreferences.preload`，并在渲染进程暴露 `$ipc` / `$clipboard` / `$webFrame` 三组已收敛的 API。

比手写 `contextBridge` 省事，也比直接开 `nodeIntegration` 安全——暴露面固定，且不含任何 `require`。

## 安装

```bash
pnpm add @quiteer/electron-preload
```

## 快速开始

包默认导出预加载脚本的绝对路径，直接交给 `preload` 即可：

```ts
import { BrowserWindow } from 'electron'
import preloadPath from '@quiteer/electron-preload'

const win = new BrowserWindow({
  width: 800,
  height: 600,
  webPreferences: {
    sandbox: true,
    preload: preloadPath
  }
})
```

CommonJS 主进程下一致：

```js
const preloadPath = require('@quiteer/electron-preload')
```

渲染进程里直接使用：

```ts
await window.$clipboard.writeText('hello')
const text = await window.$clipboard.readText()

window.$ipc.send('some-channel', { id: 1 })
window.$webFrame.setZoomFactor(1.2)
```

## 暴露的 API

### `$ipc`

| 方法 | 说明 |
| --- | --- |
| `send(channel, ...args)` | 单向发送 |
| `sendSync(channel, ...args)` | 同步发送，阻塞渲染进程，非必要请用 `invoke` |
| `invoke(channel, ...args)` | 双向调用，返回 `Promise` |
| `on(channel, listener)` | 监听主进程推送 |
| `once(channel, listener)` | 监听一次 |
| `removeAllListeners(channel?)` | 移除监听，不传通道则清空全部 |

### `$clipboard`

与新版 Electron 保持一致，全部为异步（返回 `Promise`）：

| 方法 | 说明 |
| --- | --- |
| `clear(type?)` | 清空，`type` 仅 Linux 生效，默认 `clipboard` |
| `has(mimetype)` | 是否存在指定格式 |
| `read()` | 读取全部内容，返回 `ClipboardItem[]` |
| `readText()` | 读取文本 |
| `write(data)` | 写入 `ClipboardItem[]` |
| `writeText(text)` | 写入文本 |

### `$webFrame`

| 方法 | 说明 |
| --- | --- |
| `setZoomFactor(factor)` / `getZoomFactor()` | 缩放倍数，`1` 为原始比例 |
| `setZoomLevel(level)` / `getZoomLevel()` | 缩放等级 |
| `insertText(text)` | 向焦点元素插入文本 |
| `executeJavaScript(code, userGesture?)` | 执行脚本，返回 `Promise` |
| `executeJavaScriptInIsolatedWorld(...)` | 在隔离世界执行 |
| `setIsolatedWorldInfo(...)` | 设置隔离世界信息 |
| `getResourceUsage()` | 资源占用 |
| `clearCache()` | 清空缓存 |
| `getFrameForSelector(selector)` | 按选择器取 frame |
| `firstChild()` / `nextSibling()` / `opener()` / `parent()` | 关联 frame，不存在时返回 `null` |
| `routingId()` | 当前 frame 的路由 id |

`firstChild` / `nextSibling` / `opener` / `parent` / `routingId` 在原生 `WebFrame` 上是属性，这里做成了方法——`WebFrame` 实例无法跨越 `contextBridge` 传递，只能取到值。

## 类型提示

在渲染层声明全局类型即可获得补全：

```ts
// global.d.ts
interface Window {
  $ipc: import('@quiteer/electron-preload').PreloadIpc
  $clipboard: import('@quiteer/electron-preload').PreloadClipboard
  $webFrame: import('@quiteer/electron-preload').PreloadWebFrame
}
```

配合 [@quiteer/electron-ipc](https://github.com/QuiteerJs/electron-modules/tree/main/packages/ipc) 使用时，把它的通道类型一起叠上：

```ts
interface Window {
  $ipc: import('@quiteer/electron-preload').PreloadIpc & import('@quiteer/electron-ipc/web').ExpandPreloadIpc
}
```

## 注意事项

- 产物是 CommonJS：开启 `sandbox` 时预加载脚本不支持 ESM，因此本包固定输出 `.cjs`，请勿改为 ESM 引用。
- 走的是 `contextBridge`，参数与返回值必须可序列化——函数、`Symbol`、类实例都传不过去，这也是 `executeJavaScript` 不支持回调参数的原因。
- 暴露的 API 是刻意收敛过的：需要更多能力请自行在 `ipcMain` 上加通道，而不是关闭 `sandbox`。
- 脚本路径在包安装位置下，打包时请确认 `node_modules` 内资源已随主进程产物一起分发（或用 `--extraResource` 等方式处理）。
