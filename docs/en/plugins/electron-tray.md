---
title: electron-tray
---

# @quiteer/electron-tray

> Part of the [electron-modules](https://github.com/QuiteerJs/electron-modules) family, designed to work with electronup. Source: [packages/tray](https://github.com/QuiteerJs/electron-modules/tree/main/packages/tray).

Tray management for the Electron main process: central registration, icon states, menus and events.

## Install

```bash
pnpm add @quiteer/electron-tray
```

## Quick start

```ts
import { trays } from '@quiteer/electron-tray'
import { app } from 'electron'

const tray = trays.create({
  name: 'main',
  icon: {
    idle: 'resources/tray.png',
    syncing: 'resources/tray-syncing.png',
  },
  tooltip: 'My app',
  contextMenu: [
    { label: 'Quit', click: () => app.quit() },
  ],
  onClick: ({ tray }) => tray.state = 'syncing',
})

// Look up by name from anywhere
trays.get('main')?.setToolTip('Syncing')
trays.setState('main', 'syncing')
```

## Icon states

The icon can be a state table. Setting `state` swaps the icon; no manual `NativeImage` handling:

```ts
const tray = trays.create({
  name: 'app',
  icon: { idle: 'a.png', syncing: 'b.png', error: 'c.png' },
  initialState: 'idle', // the first key is used when omitted
})

tray.state = 'syncing' // swap the icon
tray.state // 'syncing'
tray.icon = 'custom.png' // or set a single icon temporarily
```

Icon sources accept file paths, `data:` URLs and `NativeImage`, normalized as needed:

```ts
trays.create({
  name: 'app',
  icon: 'resources/tray.png',
  iconSize: { width: 16, height: 16 }, // uniform scaling
  templateIcon: true, // macOS template image, adapts to light/dark
})
```

## Type-safe names and states

```ts
// trays.ts
import { createTrayManager } from '@quiteer/electron-tray'

export const trays = createTrayManager<'main' | 'second', 'idle' | 'busy'>()

trays.create({ name: 'main', icon: { idle: 'a.png', busy: 'b.png' } })
trays.setState('main', 'busy') // ✅ completion available
trays.setState('main', 'sleep') // ❌ type error
```

## Reactive properties

A tray handle adds read/write properties on top of `Tray`:

| Property | Read | Write |
| --- | --- | --- |
| `state` | Current state name | Switch state and icon |
| `icon` | Current icon source | Set the icon directly |
| `tooltip` | Locally recorded tooltip | `setToolTip()` |
| `title` | `getTitle()` | `setTitle()` |
| `menu` | Current `Menu` instance | Pass a template / `Menu` / `null` to update the context menu |

Everything else passes through to `Tray` (methods are bound to `this`). The raw instance is `controller.target`; `controller.raw` is an alias.

Three extra methods:

```ts
tray.refreshMenu() // rebuild the menu from the template, returns the new Menu
tray.balloon({ title: 'Title', content: 'Content' }) // Windows only, returns whether it was shown
tray.destroy() // destroy and unregister
```

## Menus

Templates accept an array or a function. Function templates are re-evaluated on every `refreshMenu()`, which suits checkable or dynamic menus:

```ts
let paused = false

const tray = trays.create({
  name: 'main',
  icon: 'tray.png',
  contextMenu: () => [
    { label: paused ? 'Resume' : 'Pause', click: () => paused = !paused },
    { type: 'separator' },
    { label: 'Quit', role: 'quit' },
  ],
})

paused = true
tray.refreshMenu() // re-evaluate and setContextMenu
```

Menus can also be managed by [@quiteer/electron-menu](https://github.com/QuiteerJs/electron-modules/tree/main/packages/menu); assign `menu` to swap one in:

```ts
import { menus } from '@quiteer/electron-menu'

menus.create({
  name: 'tray',
  kind: 'context',
  template: [{ id: 'quit', label: 'Quit', role: 'quit' }],
})

const tray = trays.create({ name: 'main', icon: 'tray.png' })
tray.menu = menus.get('tray')!
```

## Create options

| Option | Type | Description |
| --- | --- | --- |
| `name` | `string` | **Required**, unique tray name |
| `icon` | `TrayIconSource \| Record<state, TrayIconSource>` | **Required**, icon source or state table |
| `initialState` | `string` | Initial state; first key when omitted |
| `tooltip` | `string` | Hover tooltip |
| `title` | `string` | Text next to the icon (macOS) |
| `titleOptions` | `TitleOptions` | Extra options for `setTitle()`, e.g. highlight color |
| `pressedIcon` | `TrayIconSource` | Pressed-state icon (macOS) |
| `iconSize` | `Size` | Uniform icon scaling |
| `templateIcon` | `boolean` | macOS template image mode |
| `contextMenu` | array / function | Context menu |
| `ignoreDoubleClick` | `boolean` | Ignore the first click of a double click |
| `popupOnClick` | `boolean` | Pop up the menu manually on left click; defaults to `false` |
| `conflict` | `'reuse' \| 'recreate' \| 'error'` | Strategy when the name is taken; defaults to `reuse` |
| `guid` | `string` | Tray identity for a stable icon position (Windows) |
| `onClick` / `onDoubleClick` / `onRightClick` / `onMiddleClick` | callbacks | Click events; the first argument is a context object |
| `onBalloonClick` / `onBalloonShow` / `onBalloonClosed` | callbacks | Balloon events (Windows) |
| `onDropFiles` | callback | File drop (macOS) |

Click callback signatures:

```ts
onClick(ctx, event, bounds, position) // click carries coordinates
onDoubleClick(ctx, event, bounds) // double-click / right-click / middle-click have no coordinates
onDropFiles(ctx, event, files) // files is an array of paths (macOS)
onBalloonClick(ctx) // balloon events carry no extra arguments
```

`ctx` contains `{ name, state, tray }`, where `tray` is the controller itself:

```ts
trays.create({
  name: 'main',
  icon: { idle: 'a.png', syncing: 'b.png' },
  onClick: ({ tray }) => tray.state = 'syncing',
})
```

## API

### `TrayManager`

| Method | Description |
| --- | --- |
| `create(options)` | Create and register a tray, returns the controller |
| `register(name, tray)` | Bring an external `Tray` under management |
| `get(name)` | Get the native `Tray` by name, `undefined` when absent |
| `getController(name)` | Get the reactive handle by name |
| `getOrThrow(name)` | Get by name, throws when missing |
| `setState(name, state)` | Switch the icon state; `false` when absent |
| `setIcon(name, icon)` | Set the icon directly |
| `setTooltip(name, text)` | Update the tooltip |
| `setMenu(name, menu)` | Update the context menu; pass `null` to clear |
| `refreshMenu(name)` | Rebuild the menu from the template |
| `balloon(name, options)` | Balloon notification, Windows only; returns whether it was shown |
| `has(name)` | Whether the tray exists |
| `destroy(name)` | Destroy and unregister |
| `destroyAll()` | Destroy all trays |
| `list()` / `names()` / `size` | Tray inventory |

### `TrayStore`

The tray store, usable on its own. Holding references is necessary: if a `Tray` instance is garbage collected, the system tray icon disappears.

```ts
store.find((controller, name) => name === 'main') // conditional lookup
store.entries() // [name, controller][]
store.remove(name) // unregister (does not destroy)
store.clear() // clear the registry (does not destroy)
store.destroyAll() // destroy and clear
```

`destroy()` on the controller is overridden to "destroy + unregister", so no stale entry remains.

## Platform differences

| Capability | Platform | When unavailable |
| --- | --- | --- |
| `title` / `pressedIcon` | macOS | No-op |
| `balloon()` | Windows | Returns `false` without calling native APIs |
| `onDropFiles` | macOS | Never fires |
| `guid` | Windows | Ignored |

On some Linux desktop environments (especially libappindicator) the tray menu does not pop up automatically. Setting `popupOnClick: true` is the usual fallback.
