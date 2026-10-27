---
title: electron-menu
---

# @quiteer/electron-menu

> One of the Electron runtime packages maintained in the electronup repository, designed to work with electronup. Source: [packages/electron-menu](https://github.com/QuiteerJs/electronup/tree/main/packages/electron-menu).

Menu management for the Electron main process: central registration, path-based lookups and automatic syncing.

## Install

```bash
pnpm add @quiteer/electron-menu
```

## Quick start

```ts
import { menus } from '@quiteer/electron-menu'

menus.create({
  name: 'app',
  template: [
    {
      id: 'file',
      label: 'File',
      submenu: [
        { id: 'file.new', label: 'New', accelerator: 'CmdOrCtrl+N' },
        { type: 'separator' },
        { id: 'file.quit', label: 'Quit', role: 'quit' },
      ],
    },
    { label: 'Edit', role: 'editMenu' },
  ],
})

// Update by path from anywhere
menus.update('app', 'file.new', { enabled: false })
```

Templates are native `MenuItemConstructorOptions[]` plus an optional `id`. There is no custom DSL.

## Path-based lookup

`id`s support dot paths: `'file.new'` means "the new item under file", at any depth:

```ts
const item = menus.item('app', 'file.new')!
item.enabled = false
item.label = 'New document'
```

Items without an `id` get an automatic positional path: top-level item 0 → `'0'`, its second child → `'0.1'`. Every item is addressable even without ids.

```ts
menus.create({
  name: 'app',
  template: [{ label: 'File', submenu: [{ label: 'New' }, { label: 'Save' }] }],
})

menus.item('app', '0.1')?.label // 'Save'
```

## Two ways to update

| | Use case | Behavior |
| --- | --- | --- |
| `update(path, patch)` | Change a few properties | Writes in place; the menu instance stays, changes apply immediately |
| `refresh()` | Rebuild entirely | Rebuilds from the template; function templates are re-evaluated |

```ts
// In-place update, good for toggles
menus.update('app', 'file.new', { enabled: false, checked: true })

// Full rebuild, good for list-style menus
let paused = false

menus.create({
  name: 'app',
  template: () => [
    { id: 'toggle', label: paused ? 'Resume' : 'Pause', click: () => { paused = !paused } },
  ],
})

paused = true
menus.refresh('app') // re-evaluate
```

## Three kinds

| `kind` | Description | After creation |
| --- | --- | --- |
| `application` (default) | Application menu | Calls `Menu.setApplicationMenu()` |
| `context` | Context menu | Not applied; call `popup()` |
| `dock` | macOS dock menu | Calls `app.dock.setMenu()`; skipped silently on other platforms |

```ts
import type { BrowserWindow } from 'electron'

menus.create({
  name: 'editor',
  kind: 'context',
  template: [
    { id: 'copy', label: 'Copy', role: 'copy' },
    { id: 'paste', label: 'Paste', role: 'paste' },
  ],
})

function showContextMenu(win: BrowserWindow): void {
  menus.popup('editor', { window: win })
}
```

## Type-safe menu names

```ts
// menus.ts
import { createMenuManager } from '@quiteer/electron-menu'

export const menus = createMenuManager<'app' | 'editor'>()

menus.create({ name: 'app', template: [] })
menus.create({ name: 'typo', template: [] }) // ❌ type error
```

## Create options

| Option | Type | Description |
| --- | --- | --- |
| `name` | `string` | **Required**, unique menu name |
| `template` | array / function | Menu template; functions are re-evaluated by `refresh()` |
| `kind` | `'application' \| 'context' \| 'dock'` | Menu purpose; defaults to `application` |
| `apply` | `boolean` | Whether `application` / `dock` menus are applied immediately; defaults to `true` |
| `conflict` | `'reuse' \| 'recreate' \| 'error'` | Strategy when the name is taken; defaults to `reuse` |
| `window` | `BaseWindow` | Default target window for `popup()` on a `context` menu |

## API

### `MenuManager`

| Method | Description |
| --- | --- |
| `create(options)` | Create and register a menu, returns the controller |
| `register(name, menu, kind?)` | Bring an external `Menu` under management |
| `get(name)` | Get the native `Menu` by name |
| `getController(name)` | Get the controller by name |
| `getOrThrow(name)` | Get by name, throws when missing |
| `item(name, path)` | Get an item handle by dot path |
| `update(name, path, patch)` | Update items by path |
| `refresh(name)` | Rebuild from the template |
| `apply(name)` | Re-apply the menu |
| `popup(name, options?)` | Pop up a context menu |
| `closePopup(name, window?)` | Close a popped-up menu |
| `has(name)` / `destroy(name)` / `destroyAll()` | Existence / unregister / clear |
| `list()` / `names()` / `size` | Menu inventory |

### `MenuController`

| Member | Description |
| --- | --- |
| `name` / `kind` / `target` | Menu name / kind / native `Menu` instance |
| `template` | Current template, writable |
| `item(path)` | Item handle by path |
| `update(path, patch)` | Update by path |
| `items()` | Top-level item handles |
| `get(id)` | Find by id (like native `getMenuItemById`, any level) |
| `append(item)` / `insert(pos, item)` | Append / insert items |
| `refresh()` | Rebuild from the template |
| `apply()` | Re-apply |
| `popup(options?)` / `closePopup(window?)` | Pop up / close |
| `on/once/off(event, listener)` | Listen to `menu-will-show` / `menu-will-close` |
| `destroy()` | Unregister |

### `MenuItemHandle`

Item handles read and write native `MenuItem` properties directly:
`label` / `sublabel` / `enabled` / `visible` / `checked` / `accelerator` / `icon` / `toolTip` / `click`.

Plus `target` (the native item; `raw` is an alias), `path` (its dot path) and `update(patch)`.

```ts
const item = menus.item('app', 'file.new')!

item.label = 'New document'
item.enabled = !busy
item.update({ label: 'New', checked: true }) // batch write
item.target // native MenuItem
```

`update()` / `refresh()` / `apply()` / `popup()` / `closePopup()` / `destroy()` on `MenuManager` return `boolean`, indicating whether the target menu exists.

### `MenuStore`

The menu store, usable on its own. Holding references is necessary: once a `Menu` is garbage collected, applied menus and registered accelerators stop working.

```ts
store.size // number of registered menus
store.names() // all menu names
store.list() // all native Menu instances
store.entries() // [name, controller][]
store.get(name) // native Menu by name
store.getController(name) // controller by name
store.find((controller, name) => name.startsWith('context')) // conditional lookup
store.has(name) // existence
store.remove(name) // unregister
store.clear() // clear the registry
store.destroyAll() // unregister everything
```

Unlike windows and trays, `Menu` has no destroy concept, so `remove()` / `clear()` / `destroyAll()` only unregister; the menus themselves stay intact.

## Platform differences

Property changes are applied differently per platform, but the package handles it:

| Platform | Behavior |
| --- | --- |
| macOS | Changes sync to the native menu automatically |
| Windows / Linux | Re-calls `setApplicationMenu()` so changes take effect |

`dock` menus exist on macOS only; other platforms call `app.dock?.setMenu()` and skip silently.
