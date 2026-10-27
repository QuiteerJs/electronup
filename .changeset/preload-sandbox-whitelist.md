---
'@quiteer/electron-preload': major
---

sandbox 下可用的 `$clipboard`、`$ipc` 通道白名单与收敛的 `$webFrame`

**破坏性变更**

- **`$ipc` 只放行白名单内的通道**。默认只放行 `@quiteer/electron-ipc` 的内置通道
  （`__window_options__` / `__file_options__`），业务通道需通过新的主进程入口
  `createPreload({ channels: { send, invoke, on } })` 显式声明，条目以 `*` 结尾时按前缀匹配。
  未声明的通道调用会直接抛错（`invoke` 返回被拒绝的 `Promise`）。
- **`$clipboard` 改为经主进程实现，且默认不暴露**。沙箱预加载脚本里没有 `clipboard` 模块，
  原实现在 `sandbox: true` 下调用即报错。现在需 `createPreload({ clipboard: true })` 开启，
  主进程处理器随之自动注册，只接受主 frame 的调用。
- `$clipboard.read` / `write` 的条目由 `ClipboardItem` 改为普通对象 `PreloadClipboardData`
  （原生 `ClipboardItem` 跨不过 IPC 与 `contextBridge`，原接口实际不可用）。
- 移除 `$webFrame` 的 `executeJavaScript` / `executeJavaScriptInIsolatedWorld` / `setIsolatedWorldInfo` /
  `getFrameForSelector` / `firstChild` / `nextSibling` / `opener` / `parent` / `routingId`。
  前三者可让页面绕开 `contextIsolation` 或伪造用户手势，其余返回的对象跨不过 `contextBridge`。
- `$ipc.removeAllListeners()` 只移除经 `$ipc` 注册的监听，不再清掉其他预加载代码挂在 `ipcRenderer` 上的监听。
- 新增 `exports` 字段，只开放 `.`、`./main` 与 `./package.json`；直接引用 `dist/*` 的写法不再可用。
- 新增 `peerDependencies.electron: >=44`、`engines.node: >=20`。

**新增**

- 主进程入口 `@quiteer/electron-preload/main`（ESM / CJS）：`createPreload` / `preloadPath` /
  `registerClipboardHandler` / `removeClipboardHandler`。
- `$clipboard` 各方法支持末位的 `type` 参数（`'clipboard' | 'selection'`，后者仅 Linux 生效）。
- 导出 `PreloadChannels` / `PreloadClipboardData` / `PreloadClipboardType` 类型。

**修复**

- `$clipboard.clear(type)` 丢掉了 `type` 参数。
