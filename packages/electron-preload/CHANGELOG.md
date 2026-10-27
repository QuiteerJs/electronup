# @quiteer/electron-preload

## 2.0.0 (2026-10-27)

### 破坏性变更

- **`$ipc.on` / `$ipc.once` 返回取消监听的函数**，不再返回 `ipcRenderer`。
  原返回值跨越 `contextBridge` 后等于把整个 `ipcRenderer` 交给页面；链式调用 `$ipc.on(...).on(...)` 需要拆开。
- **监听回调的第一个参数改为空对象占位**，不再是原生 `IpcRendererEvent`（其 `sender` 即 `ipcRenderer`）。
  参数位置不变，`(_event, ...args)` 写法无需改动；读取 `event.sender` / `event.ports` 的代码需要调整。
- `$ipc.removeAllListeners` 不再返回 `ipcRenderer`。
- 参数类型由 `any` 收紧为 `unknown`；`invoke<R>` / `sendSync<R>` 只保留返回值泛型。

### 新增

- 导出 `PreloadIpcEvent` / `PreloadIpcListener` 类型。

### 其他

- 新增测试。
- 文档：类型增强改为推荐 `@quiteer/electron-ipc/web` 的 `WithIpcChannels`。

## 1.0.0 (2026-08-29)

首个正式版本。相比 0.0.x 有若干破坏性调整，主要是适配 Electron 44 与 `sandbox` 约束。

### 破坏性变更

- **预加载脚本改为 CommonJS**：`dist/preload.js` → `dist/preload.cjs`。
  开启 `sandbox` 时预加载脚本不支持 ESM，本包固定输出 `.cjs`。
  直接引用 `dist/preload.js` 路径的项目需要更新。
- **`$clipboard` 全部改为异步**。Electron 44 移除了同步 clipboard 方法，接口随之收敛为
  `clear` / `has` / `read` / `readText` / `write` / `writeText` 六个。
  不再暴露 `readHTML` / `writeHTML` / `readImage` / `writeImage` / `readRTF` / `writeRTF` /
  `readBookmark` / `writeBookmark` / `readFindText` / `writeFindText` / `readBuffer` / `writeBuffer` / `availableFormats`。
- **`$webFrame` 的关联 frame 改为方法**。`firstChild` / `nextSibling` / `opener` / `parent` / `routingId`
  在原生 `WebFrame` 上是属性，但实例无法跨越 `contextBridge` 传递，现统一改为方法调用；
  `getFrameForSelector` 的返回值可为 `null`。
- **`executeJavaScript` 不再接收回调参数**。函数无法跨 `contextBridge` 传递，请改用返回的 `Promise`；
  `userGesture` 正常透传。

### 修复

- 包类型入口错位。`types` 此前指向 `dist/preload.d.ts`，只导出三个 interface，
  与 `main`（导出的是脚本路径字符串）不符，`import preloadPath from '@quiteer/electron-preload'`
  在 TS 下取不到正确类型。现提供 `index.d.cts`：默认导出为路径字符串，
  同时在该命名空间下挂载 `PreloadIpc` / `PreloadClipboard` / `PreloadWebFrame` 供类型引用。

### 其他

- 构建器由 tsup 迁移到 tsdown。
- 文档重写：路径导入的两种写法、三组 API 表格、全局类型声明、注意事项。
- 补齐 `repository` / `homepage` / `bugs` 元数据。
