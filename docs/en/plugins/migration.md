---
title: Migration guide
---

# Migration guide

This page covers the two upgrades that need manual work:

- [`@quiteer/electron-preload` 1.x → 3.0](#electron-preload-1x--30): **breaking change**, business channels must be allowlisted explicitly.
- [`@quiteer/electron-ipc` 3.0 → 3.2](#electron-ipc-30--32): the API is backward compatible, but the built-in channels now validate the caller; it also adds a type-safe IPC contract you can migrate to along the way.

The two packages are usually used together, so upgrade them at the same time and follow the [recommended order](#recommended-order). See each package's `CHANGELOG.md` for every change, and [`playground/modules-basic`](https://github.com/QuiteerJs/electronup/tree/main/playground/modules-basic) for a complete runnable example.

> Version note: preload 2.0.0 and ipc 3.1.0 were never published to npm on their own; their changes ship with preload 3.0.0 / ipc 3.2.0, so this guide starts from the previous npm releases (preload 1.x, ipc 3.0.x).

## electron-preload 1.x → 3.0 {#electron-preload-1x--30}

### Requirements

| Item       | Requirement                                                  |
| ---------- | ------------------------------------------------------------ |
| `electron` | `>= 44` (new `peerDependencies`, required by `$clipboard`)   |
| Node.js    | `>= 20`                                                      |

### 1. Business channels must be allowlisted (required)

Since 3.0, `$ipc` only lets allowlisted channels through. The default allowlist only has the two built-in channels of `@quiteer/electron-ipc` (`__window_options__` / `__file_options__`). **Every other channel throws**, and `invoke` returns a rejected `Promise`:

```text
[electron-preload] 通道 "user:get" 未在 invoke 白名单中, 请在 createPreload({ channels }) 中声明
```

The main process owns the allowlist: the new main process entry `@quiteer/electron-preload/main` provides `createPreload()`, which returns `{ preload, additionalArguments }` to spread into `webPreferences`.

```ts
// 1.x
import preloadPath from '@quiteer/electron-preload'

new BrowserWindow({
  webPreferences: { sandbox: true, preload: preloadPath },
})
```

```ts
// 3.0
import { createPreload } from '@quiteer/electron-preload/main'

new BrowserWindow({
  webPreferences: {
    sandbox: true,
    ...createPreload({
      channels: {
        send: ['app:quit', 'app:log'], // $ipc.send / $ipc.sendSync
        invoke: ['user:*'], // $ipc.invoke, a trailing * matches by prefix
        on: ['download:progress'], // $ipc.on / $ipc.once / $ipc.removeAllListeners
      },
    }),
  },
})
```

To find the channels to declare, search the renderer code for `$ipc.send(` / `$ipc.sendSync(` / `$ipc.invoke(` / `$ipc.on(` / `$ipc.once(` and group them by method. On the main process side they correspond to `ipcMain.on` (send), `ipcMain.handle` (invoke) and `webContents.send` (on).

Notes:

- The allowlist reaches the preload script through `additionalArguments`, so the page cannot tamper with it. **If you pass your own `additionalArguments`, merge them instead of overwriting**:

  ```ts
  const preload = createPreload({ channels })
  new BrowserWindow({
    webPreferences: {
      ...preload,
      additionalArguments: [...preload.additionalArguments, '--my-flag'],
    },
  })
  ```

- With an `@quiteer/electron-ipc` contract you do not need to write the allowlist by hand: `channels: channelsOf(api)` is enough, see [migrating to the IPC contract](#2-optional-migrate-to-the-ipc-contract).
- Built-in channels are allowed by default; projects that do not use `@quiteer/electron-ipc` can pass `builtinChannels: false` to turn them off too.
- Projects that only use built-in channels and have no business channels can keep using the default export `preloadPath`; behavior is unchanged.
- `windows.create()` in `@quiteer/electron-browser` also puts the result of `createPreload()` into `webPreferences`, merged with its secure defaults.

### 2. `$clipboard` is now opt-in (required if you use it)

In 1.x, `$clipboard` did not actually work with `sandbox: true` (the sandboxed preload has no `clipboard` module, so every call threw). 3.0 implements it through the main process and does not expose it by default:

```ts
createPreload({ clipboard: true }) // also registers the clipboard handler in the main process, repeated calls are harmless
```

Without `createPreload` you can call `registerClipboardHandler()` yourself, but only `createPreload({ clipboard: true })` makes the preload script expose `window.$clipboard`.

Types and data shapes changed accordingly:

| 1.x                                       | 3.0                                                                                              |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `window.$clipboard` always exists         | Exists only when enabled; declare the global type as optional `$clipboard?`                       |
| `read()` / `write()` use `ClipboardItem`  | Plain object `PreloadClipboardData`: `{ [mime]: string \| Uint8Array \| { title, url } }`        |
| —                                         | Every method takes an optional trailing `type: 'clipboard' \| 'selection'` (`selection` is Linux only) |
| `clear(type)` dropped `type`              | Fixed                                                                                            |

```ts
// 1.x (does not actually work in a sandbox)
await window.$clipboard.write([new ClipboardItem({ 'text/plain': blob })])

// 3.0
await window.$clipboard?.write([{ 'text/plain': 'hi', 'text/html': '<b>hi</b>' }])
const [item] = (await window.$clipboard?.read()) ?? []
```

The clipboard handler only accepts calls from the main frame; iframes embedded in the page are rejected.

### 3. `$webFrame` is narrowed (required if you use the removed members)

These members were removed:

| Removed member                                                                           | Reason                                              | Alternative                                                                          |
| ---------------------------------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `executeJavaScript`                                                                      | `userGesture` can fake a user gesture               | Run the code directly in the page; if the main process must inject, use `webContents.executeJavaScript()` |
| `executeJavaScriptInIsolatedWorld` / `setIsolatedWorldInfo`                              | Lets the page bypass `contextIsolation`             | Move logic that needs isolated worlds into your own preload script or the main process |
| `getFrameForSelector` / `firstChild` / `nextSibling` / `opener` / `parent` / `routingId` | The returned `WebFrame` cannot cross `contextBridge` | Walk frames in the main process with `webContents.mainFrame.frames` / `framesInSubtree` |

The remaining members are unchanged: `setZoomFactor` / `getZoomFactor` / `setZoomLevel` / `getZoomLevel` / `insertText` / `getResourceUsage` / `clearCache`.

### 4. `$ipc.removeAllListeners()` only removes its own listeners

Since 3.0 it only removes listeners registered through `$ipc` and no longer clears listeners that other preload code attached to `ipcRenderer`. Code that relied on "clear every listener" usually needs no change; if you happened to rely on it to clear listeners elsewhere, unregister them in that code instead.

### 5. `$ipc.on` / `$ipc.once` return an unsubscribe function, and the callback event is a placeholder (required, since 2.0)

The old return value crossed `contextBridge` and handed the whole `ipcRenderer` to the page, so it now returns a function that removes the listener:

```ts
// 1.x
window.$ipc.on('a', onA).on('b', onB)

// 3.0
const offA = window.$ipc.on('a', onA)
const offB = window.$ipc.on('b', onB)
offA()
```

The first callback argument is now an empty placeholder object instead of the native `IpcRendererEvent`. `(_event, ...args)` callbacks need no change; code that reads `event.sender` / `event.ports` does. Argument types are narrowed from `any` to `unknown`, and `invoke<R>` / `sendSync<R>` only keep the return type parameter.

### 6. No more deep imports from `dist/*`

`package.json` now has `exports`, which only exposes `.`, `./main` and `./package.json`:

```ts
// 1.x: no longer works, throws ERR_PACKAGE_PATH_NOT_EXPORTED
require.resolve('@quiteer/electron-preload/dist/preload.cjs')

// 3.0: pick one
import preloadPath from '@quiteer/electron-preload'
import { preloadPath } from '@quiteer/electron-preload/main'
```

### 7. Global types

```ts
// global.d.ts
interface Window {
  $ipc: import('@quiteer/electron-ipc/web').WithIpcChannels<
    import('@quiteer/electron-preload').PreloadIpc
  >
  $webFrame: import('@quiteer/electron-preload').PreloadWebFrame
  $clipboard?: import('@quiteer/electron-preload').PreloadClipboard // only present when clipboard is enabled
}
```

### Checklist

- [ ] `electron` is `>= 44`
- [ ] Every place that creates a window uses `createPreload()` and declares all business channels
- [ ] Custom `additionalArguments` are merged with the return value of `createPreload()`
- [ ] Windows that use `$clipboard` pass `clipboard: true`, and `ClipboardItem` is replaced with plain objects
- [ ] No removed `$webFrame` member is called anymore
- [ ] Chained `$ipc.on(...)` calls are split, and nothing reads `sender` / `ports` from the callback event
- [ ] Nothing deep-imports `@quiteer/electron-preload/dist/*`
- [ ] Every window has been exercised and the console shows no "未在 xxx 白名单中" (not in allowlist) errors

## electron-ipc 3.0 → 3.2 {#electron-ipc-30--32}

3.2 does not remove or change any API, so existing code can upgrade directly. Watch out for one **behavior change** and a few subtle differences from fixes, and consider migrating to one new feature.

### Requirements

| Item       | Requirement                           |
| ---------- | ------------------------------------- |
| `electron` | `>= 30` (new `peerDependencies`)      |
| Node.js    | `>= 20`                               |

### 1. Built-in channels validate the caller (behavior change)

The two built-in channels registered by `Ipc.init()` **only accept calls from the main frame** by default:

- Window operations from a subframe (including third-party iframes embedded in the page) are **silently ignored**;
- Subframe calls to the path channel `__file_options__` are **rejected with an error**: `[electron-ipc] 调用来源未通过校验`;
- Calls are also rejected when the frame has navigated away or been destroyed (`senderFrame` is `null`).

Most apps only call from the main frame and need no change. It is a good idea to restrict page origins as well:

```ts
Ipc.init({ allowedOrigins: ['file://', 'http://localhost:5173'] })
```

`file://` matches by protocol; everything else matches `URL.origin` exactly. When developing against a dev server, add its origin too, or calls will be rejected.

If iframes really need the built-in channels, write your own rule with `validateSender`. **It fully replaces the default check, including the main frame check**, so be careful:

```ts
Ipc.init({
  validateSender: (event) => {
    const url = event.senderFrame?.url ?? ''
    return url.startsWith('file://') || url.startsWith('https://widgets.example.com/')
  },
})
```

`Ipc.init()` is idempotent and keeps the options from the first call; to change options call `Ipc.destroy()` first, then `Ipc.init(newOptions)`.

### 2. (Optional) Migrate to the IPC contract {#2-optional-migrate-to-the-ipc-contract}

3.2 adds an end-to-end type-safe contract: one definition drives the main process handlers, the renderer client and the preload allowlist. The old "channel name string + `unknown` arguments" style still works, so you can migrate one channel at a time.

**Before**: the channel name is written three times and types are aligned by hand.

```ts
// main
ipcMain.handle('user:get', (event, id: string) => db.users.find(id))
ipcMain.on('app:log', (event, msg: string) => logger.info(msg))
win.webContents.send('download:progress', 0.5)

// createPreload
createPreload({
  channels: { invoke: ['user:get'], send: ['app:log'], on: ['download:progress'] },
})

// renderer
const user = (await window.$ipc.invoke('user:get', '1')) as User
window.$ipc.on('download:progress', (_event, percent) => render(percent as number))
```

**After**:

```ts
// shared/ipc.ts —— only depends on the /web entry, so main, preload and renderer can all import it
import { channel, defineContract } from '@quiteer/electron-ipc/web'

export const api = defineContract({
  invoke: { 'user:get': channel<(id: string) => User>() },
  send: { 'app:log': channel<(msg: string) => void>() },
  on: { 'download:progress': channel<(percent: number) => void>() },
})
```

```ts
// main
import { channelsOf, createEmitter, handleContract, Ipc } from '@quiteer/electron-ipc'
import { createPreload } from '@quiteer/electron-preload/main'
import { api } from '../shared/ipc'

const allowedOrigins = ['file://']
Ipc.init({ allowedOrigins })
handleContract(
  api,
  {
    invoke: { 'user:get': (ctx, id) => db.users.find(id) },
    send: { 'app:log': (ctx, msg) => logger.info(ctx.window?.id, msg) },
  },
  { allowedOrigins },
)

const emitter = createEmitter(api)
emitter.emit(win, 'download:progress', 0.5)

new BrowserWindow({
  webPreferences: { ...createPreload({ channels: channelsOf(api) }) },
})
```

```ts
// renderer
import { createClient } from '@quiteer/electron-ipc/web'
import { api } from '../shared/ipc'

const client = createClient(api)
const user = await client.invoke('user:get', '1') // Promise<User>
const off = client.on('download:progress', (percent) => render(percent))
```

Common pitfalls when migrating:

| Change                                   | Details                                                                                                                         |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| First handler argument                   | Changes from `event` to `ctx = { event, sender, window }`; the native event is `ctx.event`                                      |
| Renderer listener callback               | `client.on` callbacks **do not receive the event**, only the arguments: `(percent) => {}`, while `$ipc.on` is `(_event, percent) => {}` |
| No duplicate registrations               | Remove the old `ipcMain.handle` for migrated channels, or `handleContract` throws "Attempted to register a second handler" and rolls back |
| Every contract channel must be handled   | A missing `invoke` / `send` handler is a type error and also throws at runtime before registration                              |
| Contract channels validate the caller too | The third argument of `handleContract` matches `Ipc.init()` and only accepts the main frame by default; pass the same `allowedOrigins` to both |
| Channel names outside the contract       | `createClient` also rejects them at runtime; `as any` does not get around it                                                    |
| Multiple contracts                       | `channelsOf(api, settingsApi)` merges and deduplicates; with `builtinChannels` off you can also merge the exported `builtinChannels` |

To validate arguments at the main process boundary, pass any [Standard Schema](https://standardschema.dev) (zod / valibot / arktype, etc.) to `channel`:

```ts
channel<(id: string) => User>({ args: z.tuple([z.string().uuid()]) })
```

When validation fails, `invoke` rejects with an error and `send` drops the call and logs with `console.error`.

### 3. Use `WithIpcChannels` for type augmentation

If you still use `PreloadIpc & ExpandPreloadIpc`, it never reports errors (the loose signature of `PreloadIpc` swallows every call). Switch to:

```ts
interface Window {
  $ipc: import('@quiteer/electron-ipc/web').WithIpcChannels<
    import('@quiteer/electron-preload').PreloadIpc
  >
}
```

### 4. Differences from other fixes

- `Ipc.init()` is idempotent: calling it again no longer throws "Attempted to register a second handler".
- `Ipc.destroy()` only removes listeners registered by this package and no longer clears your callbacks on the same channels.
- Prototype keys such as `toString` / `__proto__` sent from the renderer no longer hit a handler; window operations on destroyed windows are ignored.
- Adds `Ipc.initialized`, and the main entry also exports `EventKeys` / `IpcWindowOptions` / `IpcFileOptions`.

### Checklist

- [ ] No built-in channels are called from iframes; if any are, allow them with `validateSender`
- [ ] `Ipc.init()` receives `allowedOrigins`, including the dev server origin in development
- [ ] (Optional) Business channels are moved to `defineContract` and the old `ipcMain.handle` / `ipcMain.on` are removed
- [ ] (Optional) The preload allowlist uses `channelsOf(api)`

## Recommended order {#recommended-order}

1. Upgrade dependencies: `electron >= 44`, `@quiteer/electron-preload@^3`, `@quiteer/electron-ipc@^3.2`.
2. Call `Ipc.init({ allowedOrigins })` after `app.whenReady()` in the main process.
3. Create a shared contract file, move business channels into it, implement them with `handleContract` and push with `createEmitter` in the main process, and remove the old `ipcMain.handle` / `ipcMain.on`.
4. Change every window's `webPreferences` to `...createPreload({ channels: channelsOf(api), clipboard: when you use the clipboard })`.
5. Use `createClient(api)` in the renderer; channels not migrated yet keep using `window.$ipc`, but must be in the allowlist.
6. Update `global.d.ts`, then click through every window.

## Common errors

| Error                                                      | Cause and fix                                                                        |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `[electron-preload] 通道 "x" 未在 send/invoke/on 白名单中` | The channel is missing from `createPreload({ channels })`; with a contract, check that `channelsOf(api)` is passed |
| `window.$clipboard` is `undefined`                         | The window was created without `createPreload({ clipboard: true })`                  |
| `[electron-preload] 只允许主 frame 访问剪贴板`             | The clipboard was called from an iframe; move the call to the main frame             |
| `[electron-ipc] 调用来源未通过校验`                        | The path channel was called from a subframe or a page outside `allowedOrigins`       |
| `[electron-ipc] 拒绝来自不可信 frame 的调用: x`            | Same for contract channels; check the third argument of `handleContract`             |
| Window operations do nothing and report no error           | Window channels silently ignore calls that fail validation; debug as above           |
| `Attempted to register a second handler for 'x'`           | The channel has both an old `ipcMain.handle` and a contract entry; remove the old one |
| `[electron-ipc] 契约通道 invoke:x 未实现处理函数`          | `handleContract` is missing the handler for that channel                             |
| `ERR_PACKAGE_PATH_NOT_EXPORTED` (preload)                  | A deep import of `dist/*`; use the default export or `preloadPath` from `@quiteer/electron-preload/main` |
