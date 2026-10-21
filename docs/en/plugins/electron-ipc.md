---
title: electron-ipc
---

# @quiteer/electron-ipc

> Part of the [electron-modules](https://github.com/QuiteerJs/electron-modules) family, designed to work with electronup. Source: [packages/ipc](https://github.com/QuiteerJs/electron-modules/tree/main/packages/ipc).

Preset IPC channels for an Electron main process: one `init()` call lets the renderer control its own window and call `node:path` helpers.

The package holds no global state: every window operation targets the window derived from `event.sender`, so a renderer cannot touch another window.

## Install

```bash
pnpm add @quiteer/electron-ipc
```

## Quick start

Initialize in the main process:

```ts
import { Ipc } from '@quiteer/electron-ipc'
import { app } from 'electron'

app.whenReady().then(() => {
  Ipc.init()
})
```

Send messages from the renderer (together with the preload-exposed `window.$ipc`):

```ts
import { EventKeys, IpcWindowOptions } from '@quiteer/electron-ipc/web'

// Maximize the current window
window.$ipc.send(EventKeys.WindowOptionsKey, IpcWindowOptions.MAXIMIZE)

// Join paths; returns a Promise
const full = await window.$ipc.invoke(EventKeys.FileOptionsKey, 'join', '/user', 'local')
```

## Built-in channels

### `__window_options__` — window control

`send` is one-way and always targets the window that sent the message.

| Enum | Value | Description |
| --- | --- | --- |
| `DESTROY` | `destroy` | Destroy the window, firing `closed` |
| `CLOSE` | `close` | Try to close, like clicking the close button (the page can intercept) |
| `SHOW` | `show` | Show |
| `HIDE` | `hide` | Hide |
| `FOCUS` | `focus` | Focus |
| `BLUR` | `blur` | Blur |
| `MAXIMIZE` | `maximize` | Maximize |
| `UNMAXIMIZE` | `unmaximize` | Unmaximize |
| `MINIMIZE` | `minimize` | Minimize |
| `RESTORE` | `restore` | Restore from minimized |
| `RELOAD` | `reload` | Reload |
| `SET_FULL_SCREEN` | `setFullScreen` | Fullscreen, accepts `flag: boolean` |
| `SET_TITLE` | `setTitle` | Set the title, accepts `title: string` |
| `FLASH_FRAME` | `flashFrame` | Flash the taskbar, accepts `flag: boolean` |
| `SWITCH_FOCUS` | `switch-focus` | Toggle focus |
| `SWITCH_MAX` | `switch-max` | Toggle maximize / restore |
| `SWITCH_MIN` | `switch-min` | Toggle minimize / restore |
| `SWITCH_FULL` | `switch-full` | Toggle fullscreen |
| `SWITCH_RESIZABLE` | `switch-resizable` | Toggle resizable |
| `SWITCH_MOVABLE` | `switch-movable` | Toggle movable (no effect on Linux) |
| `SWITCH_MINIMIZABLE` | `switch-minimizable` | Toggle minimizable (no effect on Linux) |
| `SWITCH_MAXIMIZABLE` | `switch-maximizable` | Toggle maximizable (no effect on Linux) |
| `SWITCH_ALWAYS_ON_TOP` | `switch-always-on-top` | Toggle always-on-top |

Calls with arguments:

```ts
window.$ipc.send(EventKeys.WindowOptionsKey, IpcWindowOptions.SET_TITLE, 'New title')
window.$ipc.send(EventKeys.WindowOptionsKey, IpcWindowOptions.SET_FULL_SCREEN, true)
```

### `__file_options__` — path utilities

`invoke` is two-way and returns a `Promise`. It is equivalent to calling the same `node:path` method in the main process.

| Enum | Value | Equivalent |
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

## Renderer type augmentation

The package provides `ExpandPreloadIpc`; combine it with the preload `$ipc` type to get channel and argument completion:

```ts
// global.d.ts
interface Window {
  $ipc: import('@quiteer/electron-preload').PreloadIpc & import('@quiteer/electron-ipc/web').ExpandPreloadIpc
}
```

After that, unknown channels or missing arguments are type errors:

```ts
window.$ipc.send('__window_options__', 'destroy') // ✅
window.$ipc.invoke('__file_options__', 'join', '/', '/experiment') // ✅
window.$ipc.send('__window_options__', 'not-exist') // ❌ type error
```

## Working with `@quiteer/electron-browser`

This package resolves windows from `event.sender`. If you also manage windows by name, look the source window up in your own business channel:

```ts
import { ipcMain } from 'electron'
import { windows } from '@quiteer/electron-browser'

ipcMain.on('custom', (event) => {
  const controller = windows.store.fromWebContents(event.sender)
  controller?.target.webContents.send('custom:reply', controller.name)
})
```

## API

`Ipc` is a singleton; use it directly.

| Member | Description |
| --- | --- |
| `Ipc.init()` | Registers listeners and handlers for both built-in channels |
| `Ipc.destroy()` | Unregisters them; call before quitting or on hot reload |

## Notes

- Call `init()` once, after `app.whenReady()` in the main process. Repeated calls stack `ipcMain.on` listeners, so pair them with `destroy()`.
- Window operations only affect the calling window. Renderers cannot target other windows; this is intentional.
- Always use `EventKeys` instead of raw channel strings to avoid typos.
- The package is ESM-only. Use an ESM main process, or let a bundler (electron-builder / vite / esbuild) compile it. `require()` from a CJS main process throws `ERR_PACKAGE_PATH_NOT_EXPORTED`.
