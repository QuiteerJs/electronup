---
title: electron-browser
---

# @quiteer/electron-browser

> Part of the [electron-modules](https://github.com/QuiteerJs/electron-modules) family, designed to work with electronup. Source: [packages/browser](https://github.com/QuiteerJs/electron-modules/tree/main/packages/browser).

Window management for the Electron main process: central registration, lookups anywhere and reactive properties.

## Install

```bash
pnpm add @quiteer/electron-browser
```

## Quick start

```ts
import { windows } from '@quiteer/electron-browser'

// Create and register
const main = windows.create({
  name: 'main',
  width: 1200,
  height: 800,
  url: 'https://example.com',
})

main.title = 'My app' // assign properties directly
main.centered = true

// Look up by name from anywhere
windows.get('main')?.webContents.send('ping')
windows.focus('main')
```

## Type-safe window names

```ts
// windows.ts
import { createWindowManager } from '@quiteer/electron-browser'

export const windows = createWindowManager<'main' | 'settings'>()

windows.create({ name: 'main' })
windows.get('settings') // ✅ completion available
windows.get('setting') // ❌ type error
```

## Reactive properties

A window handle adds a set of read/write properties on top of `BrowserWindow`:

| Property | Read | Write |
| --- | --- | --- |
| `width` / `height` | `getSize()` | `setSize()`; updating one side keeps the other |
| `x` / `y` | `getPosition()` | `setPosition()` |
| `title` | `getTitle()` | `setTitle()` |
| `visible` | `isVisible()` | `show()` / `hide()` |
| `centered` | — | `true` triggers `center()` |

Everything else passes through to `BrowserWindow` (methods are bound to `this`). The raw instance is available as `controller.target`; `controller.raw` is an equivalent alias.

```ts
const main = windows.getController('main')!

main.webContents.send('ping') // pass-through method, no `this` concerns
main.target // native BrowserWindow
main.name // 'main'
```

## Create options

Extends `BrowserWindowConstructorOptions` with:

| Option | Type | Description |
| --- | --- | --- |
| `name` | `string` | **Required**, unique window name |
| `url` | `string` | `loadURL` immediately after creation |
| `openDevTools` | `boolean` | Open DevTools immediately after creation |
| `showOnReady` | `boolean` | Shown on `ready-to-show` unless `show: true` is set; defaults to `true` |
| `conflict` | `'focus' \| 'recreate' \| 'error'` | Strategy when the name is taken; defaults to `focus` |

| Strategy | Behavior |
| --- | --- |
| `focus` (default) | Reuse and focus the existing window; returns the original handle without creating a new window |
| `recreate` | Close the old window and create a new one |
| `error` | Throw, suitable for singleton windows |

`register()` only replaces the mapping; it does not close an old window. Windows created outside the manager are your responsibility.

## API

### `WindowManager`

| Method | Description |
| --- | --- |
| `create(options)` | Create and register a window, returns the controller |
| `register(name, win)` | Bring an externally created window under management |
| `get(name)` | Get the `BrowserWindow` by name, `undefined` when absent |
| `getController(name)` | Get the reactive handle by name |
| `getOrThrow(name)` | Get by name, throws when missing |
| `has(name)` | Whether the window exists |
| `focus(name)` | Restore and focus; returns `false` when absent |
| `close(name)` | Close; returns `false` when absent |
| `closeAll()` | Close all windows (Promise, waits for every `closed`) |
| `broadcast(channel, ...args)` | Broadcast to every window |
| `list()` / `names()` / `size` | Window inventory |

### `WinStore`

The window store, usable on its own. `closed` windows are removed automatically, and lookups verify `isDestroyed()` so you never receive a destroyed window.

```ts
store.fromId(id) // look up by window id
store.fromWebContents(webContents) // look up by webContents (or its id)
store.getName(win) // reverse lookup by instance (or id)
store.entries() // [name, controller][]
store.remove(name) // unregister (does not close)
store.clear() // clear the registry
store.closeAll() // close everything and wait for `closed`
```

`fromWebContents()` is handy in IPC callbacks to locate the source window:

```ts
import { ipcMain } from 'electron'
import { windows } from '@quiteer/electron-browser'

ipcMain.on('custom', (event) => {
  const controller = windows.store.fromWebContents(event.sender)
  controller?.target.webContents.send('custom:reply', controller.name)
})
```
