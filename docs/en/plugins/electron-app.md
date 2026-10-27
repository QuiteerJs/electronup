---
title: electron-app
---

# @quiteer/electron-app

> One of the Electron runtime packages maintained in the electronup repository, designed to work with electronup. Source: [packages/electron-app](https://github.com/QuiteerJs/electronup/tree/main/packages/electron-app).

Electron app lifecycle boilerplate in one call: single instance lock, deep links, recreating the main window on macOS `activate`, and graceful quit.

## Install

```bash
pnpm add @quiteer/electron-app
```

## Quick start

Call it **synchronously at the top level** of the main process entry (not inside `whenReady`, or you will miss `open-url` during macOS launch):

```ts
import { setupApp } from '@quiteer/electron-app'
import { windows } from '@quiteer/electron-browser'
import { trays } from '@quiteer/electron-tray'

const lifecycle = setupApp({
  windows,
  mainWindow: 'main',
  createMainWindow: () => windows.create({ name: 'main', width: 1200, height: 800, url }),
  onReady: () => {
    // menus / trays / ipc, runs before the main window is created
  },
  protocols: 'myapp',
  onOpenUrl: (url) => windows.get('main')?.webContents.send('deep-link', url),
  beforeQuit: [() => trays.destroyAll(), () => windows.closeAll()],
})
```

`@quiteer/electron-browser` is optional: pass a getter such as `() => mainWin` as `mainWindow`, or omit it to use the first live window.

## What it does

| Scenario                 | Behavior                                                                                         |
| ------------------------ | ------------------------------------------------------------------------------------------------ |
| Launch                   | Requests the single instance lock and quits if it fails; after ready calls `onReady`, then `createMainWindow` |
| Second instance launched | Restores and focuses the main window (creates it if missing), dispatches deep links in argv, calls `onSecondInstance` |
| Deep link                | Registers the default protocol client; unifies macOS `open-url` and Windows / Linux argv, buffered until ready |
| macOS open file          | Forwards `open-file` to `onOpenFile`                                                             |
| macOS Dock click         | Calls `createMainWindow` when no window exists                                                   |
| All windows closed       | Quits on non-macOS platforms (configurable with `quitOnAllWindowsClosed`)                        |
| Quit                     | Runs cleanup tasks in order, errors do not stop the chain, forces quit after `quitTimeout` (5s by default), then quits |

## Hide to tray

`isQuitting` tells "the user clicked the close button" apart from "the app is quitting":

```ts
const win = windows.create({ name: 'main', url })
win.on('close', (event) => {
  if (!lifecycle.isQuitting) {
    event.preventDefault()
    win.hide()
  }
})

setupApp({ quitOnAllWindowsClosed: false /* ... */ })
```

## API

### `setupApp(options)`

| Option                   | Description                                                                          |
| ------------------------ | ------------------------------------------------------------------------------------ |
| `singleInstance`         | Single instance lock, `true` by default; pass an object to set `focus: false` and `additionalData` |
| `windows`                | Object that looks windows up by name, usually `windows` from `@quiteer/electron-browser` |
| `mainWindow`             | Main window name (with `windows`) or a getter                                        |
| `createMainWindow`       | Creates the main window                                                              |
| `onReady`                | Called after ready and before the main window is created, may return a Promise       |
| `protocols`              | Schemes to register, such as `'myapp'` or `['myapp', 'myapp-dev']`                   |
| `onOpenUrl(url, ctx)`    | Deep link received, `ctx.source` is `launch` / `second-instance` / `open-url`        |
| `onOpenFile(path, ctx)`  | File to open received (macOS)                                                        |
| `onSecondInstance(ctx)`  | A second instance launched, `ctx` has `argv` / `workingDirectory` / `additionalData` |
| `quitOnAllWindowsClosed` | Whether to quit when all windows close, `true` on non-macOS by default               |
| `beforeQuit`             | Cleanup tasks run in order before quitting                                           |
| `quitTimeout`            | Total timeout for cleanup tasks, `5000` by default                                   |
| `onError(error, phase)`  | Called when a callback throws, `console.error` by default                            |

### Returned controller

| Member               | Description                                                  |
| -------------------- | ------------------------------------------------------------ |
| `isPrimary`          | Whether the single instance lock was acquired; skip initialization when `false` |
| `isQuitting`         | Whether the quit flow has started                            |
| `getMainWindow()`    | Gets the main window                                         |
| `focusMainWindow()`  | Restores and focuses the main window, creating it if missing |
| `onBeforeQuit(task)` | Adds a cleanup task, returns a function that removes it      |
| `quit()`             | Quits (runs cleanup tasks first)                             |
| `dispose()`          | Removes every app listener registered by this package        |

`registerProtocols` / `extractUrls` / `normalizeSchemes` are also exported for standalone use.
