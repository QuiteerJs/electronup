---
title: electron-preload
---

# @quiteer/electron-preload

> Part of the [electron-modules](https://github.com/QuiteerJs/electron-modules) family, designed to work with electronup. Source: [packages/preload](https://github.com/QuiteerJs/electron-modules/tree/main/packages/preload).

Preload script for Electron: import it to get the script path, plug it into `webPreferences.preload`, and expose the curated `$ipc` / `$clipboard` / `$webFrame` APIs to the renderer.

It saves you from writing `contextBridge` boilerplate while staying safer than `nodeIntegration` — the exposed surface is fixed and contains no `require`.

## Install

```bash
pnpm add @quiteer/electron-preload
```

## Quick start

The default export is the absolute path of the preload script; pass it to `preload` directly:

```ts
import { BrowserWindow } from 'electron'
import preloadPath from '@quiteer/electron-preload'

const win = new BrowserWindow({
  width: 800,
  height: 600,
  webPreferences: {
    sandbox: true,
    preload: preloadPath,
  },
})
```

The same works in a CommonJS main process:

```js
const preloadPath = require('@quiteer/electron-preload')
```

Use it in the renderer:

```ts
await window.$clipboard.writeText('hello')
const text = await window.$clipboard.readText()

window.$ipc.send('some-channel', { id: 1 })
window.$webFrame.setZoomFactor(1.2)
```

## Exposed APIs

### `$ipc`

| Method | Description |
| --- | --- |
| `send(channel, ...args)` | One-way send |
| `sendSync(channel, ...args)` | Synchronous send; blocks the renderer, prefer `invoke` unless necessary |
| `invoke(channel, ...args)` | Two-way call, returns a `Promise` |
| `on(channel, listener)` | Listen to main process pushes |
| `once(channel, listener)` | Listen once |
| `removeAllListeners(channel?)` | Remove listeners; clears all channels when omitted |

### `$clipboard`

All methods are asynchronous (`Promise`), matching recent Electron versions:

| Method | Description |
| --- | --- |
| `clear(type?)` | Clear; `type` only applies on Linux, defaults to `clipboard` |
| `has(mimetype)` | Whether the format exists |
| `read()` | Read everything, returns `ClipboardItem[]` |
| `readText()` | Read text |
| `write(data)` | Write `ClipboardItem[]` |
| `writeText(text)` | Write text |

### `$webFrame`

| Method | Description |
| --- | --- |
| `setZoomFactor(factor)` / `getZoomFactor()` | Zoom factor; `1` is the original size |
| `setZoomLevel(level)` / `getZoomLevel()` | Zoom level |
| `insertText(text)` | Insert text into the focused element |
| `executeJavaScript(code, userGesture?)` | Execute script, returns a `Promise` |
| `executeJavaScriptInIsolatedWorld(...)` | Execute in an isolated world |
| `setIsolatedWorldInfo(...)` | Configure an isolated world |
| `getResourceUsage()` | Resource usage |
| `clearCache()` | Clear cache |
| `getFrameForSelector(selector)` | Get a frame by selector |
| `firstChild()` / `nextSibling()` / `opener()` / `parent()` | Related frames, `null` when absent |
| `routingId()` | Routing id of the current frame |

On the native `WebFrame`, `firstChild` / `nextSibling` / `opener` / `parent` are properties and `routingId` is a method. Here they are all methods, because `WebFrame` instances cannot cross `contextBridge` — only plain values can.

## Type hints

Declare the globals in the renderer for completion:

```ts
// global.d.ts
interface Window {
  $ipc: import('@quiteer/electron-preload').PreloadIpc
  $clipboard: import('@quiteer/electron-preload').PreloadClipboard
  $webFrame: import('@quiteer/electron-preload').PreloadWebFrame
}
```

When used with [@quiteer/electron-ipc](https://github.com/QuiteerJs/electron-modules/tree/main/packages/ipc), merge its channel types too:

```ts
interface Window {
  $ipc: import('@quiteer/electron-preload').PreloadIpc & import('@quiteer/electron-ipc/web').ExpandPreloadIpc
}
```

## Notes

- The output is CommonJS. Preload scripts cannot be ESM when `sandbox` is enabled, so this package always emits `.cjs`; do not import it as ESM.
- Everything crosses `contextBridge`, so arguments and return values must be serializable — functions, `Symbol`s and class instances cannot pass through. This is why `executeJavaScript` takes no callback.
- The exposed surface is intentionally small. Add your own `ipcMain` channels for more capabilities instead of disabling `sandbox`.
- The script path lives inside the installed package. When packaging, make sure resources under `node_modules` ship with the main process output (or handle it with `--extraResource` and similar).
