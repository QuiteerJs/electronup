---
title: electron-shortcut
---

# @quiteer/electron-shortcut

> One of the Electron runtime packages maintained in the electronup repository, designed to work with electronup. Source: [packages/electron-shortcut](https://github.com/QuiteerJs/electronup/tree/main/packages/electron-shortcut).

Global shortcut management for the Electron main process: register by name, conflict detection, enable by window focus, and automatic unregistering on quit.

## Install

```bash
pnpm add @quiteer/electron-shortcut
```

## Quick start

```ts
import { shortcuts } from '@quiteer/electron-shortcut'

shortcuts.register({
  name: 'toggle',
  accelerator: 'CmdOrCtrl+Shift+K',
  handler: () => console.error('pressed'),
})

// look it up by name anywhere
shortcuts.disable('toggle')
shortcuts.get('toggle')!.accelerator = 'Alt+Space' // rebind, rolls back automatically on failure
```

You can register before the app is ready; shortcuts take effect after ready and are unregistered on `will-quit`.

## Conflict detection

`globalShortcut.register` only returns `false` silently when the accelerator is taken. This package throws a `ShortcutError` with the reason instead:

```ts
import { ShortcutError, shortcuts } from '@quiteer/electron-shortcut'

try {
  shortcuts.register({ name: 'search', accelerator: 'Alt+Space', handler: openSearch })
} catch (error) {
  if (error instanceof ShortcutError) {
    error.reason // 'occupied' taken by another app | 'duplicate' taken by another shortcut of this app | 'invalid' malformed accelerator
    error.owner // name of the owner when reason is duplicate
  }
}

// pass onError to skip try/catch
shortcuts.register({
  name: 'search',
  accelerator: ['Alt+Space', 'CmdOrCtrl+Shift+Space'], // any of them triggers, succeeds only if all register
  handler: openSearch,
  onError: (error) => notify(error.message),
})
```

## Enable by focus

System-wide shortcuts steal keys from other apps, and many shortcuts should only work while your own window is focused:

```ts
import { windows } from '@quiteer/electron-browser'

// active while any window of the app is focused
shortcuts.register({ name: 'find', accelerator: 'CmdOrCtrl+F', scope: 'focused', handler: find })

// active only while the given window is focused; the same accelerator can go to different windows and is handed over on focus change
shortcuts.register({
  name: 'save',
  accelerator: 'CmdOrCtrl+S',
  window: () => windows.get('editor'),
  handler: save,
})
```

When `window` is a window instance, the shortcut is unregistered automatically after the window closes.

## Reactive handle

| Property      | Read                                          | Write                                  |
| ------------- | --------------------------------------------- | -------------------------------------- |
| `accelerator` | Current accelerator list                      | Rebind, rolls back to the old one on failure |
| `enabled`     | Whether it is enabled                         | Enable / disable                       |
| `handler`     | Current callback                              | Replace the callback                   |
| `registered`  | Whether it is actually registered with the OS (read only) | -                          |

## Manager API

| Method                                      | Description                                             |
| ------------------------------------------- | ------------------------------------------------------- |
| `register(options)`                         | Registers a shortcut and returns its handle             |
| `get(name)` / `getOrThrow(name)`            | Gets a handle by name                                   |
| `enable(name)` / `disable(name)`            | Enables / disables (keeps the registration)             |
| `setAccelerator(name, accelerator)`         | Rebinds                                                 |
| `unregister(name)` / `unregisterAll()`      | Unregisters and removes                                 |
| `suspend()` / `resume()`                    | Pauses / resumes all, useful while recording a new shortcut |
| `ownerOf(accelerator)`                      | Name of the shortcut currently holding the accelerator  |
| `isRegistered(accelerator)`                 | Whether this app has registered the accelerator         |
| `has(name)` / `names()` / `list()` / `size` | Queries                                                 |

Registering the same name again defaults to `recreate` (replaces the old binding); change it with `conflict: 'reuse' | 'error'`.

## Type-safe names

```ts
import { createShortcutManager } from '@quiteer/electron-shortcut'

export const shortcuts = createShortcutManager<'toggle' | 'save'>()

shortcuts.disable('toggle') // ✅
shortcuts.disable('nope') // ❌ type error
```
