# @quiteer/electron-ipc

## 3.2.0 (未发布)

### 新增

- **内置通道校验调用来源**：`Ipc.init(options?)` 默认只接受主 frame 的调用，子 frame（含第三方 iframe）
  无法再让窗口 destroy / 最小化或调用路径通道。可选 `allowedOrigins` 限定页面来源（`file://` 按协议匹配），
  或用 `validateSender` 完全自定义。
- 导出 `IpcInitOptions` 类型。
- 声明 `peerDependencies.electron: >=30`、`engines.node: >=20`、`sideEffects: false`。

## 3.1.0 (2026-10-27)

### 新增

- web 入口新增 `WithIpcChannels<PreloadIpc>`：把内置通道的精确签名叠加到 `$ipc` 上，写错操作名或漏传参数会类型报错。
  此前文档推荐的 `PreloadIpc & ExpandPreloadIpc` 会被 `PreloadIpc` 的宽松签名兜住，实际不会报错。
- 主入口额外导出 `EventKeys` / `IpcWindowOptions` / `IpcFileOptions`。
- 新增 `Ipc.initialized`。

### 修复

- `Ipc.init()` 改为幂等。此前重复调用会让 `ipcMain.handle` 抛出 “Attempted to register a second handler”。
- `Ipc.destroy()` 只移除本包注册的监听，不再 `removeAllListeners` 误伤业务方挂在同名通道上的回调。
- 渲染层传入 `toString` / `__proto__` 等原型链上的键不再命中处理函数。
- 窗口已销毁时直接忽略窗口操作。

### 其他

- 源码迁移到 `src/`，修正 `eventKays` 拼写，处理表改为 `Record` 以便枚举新增成员时类型检查兜底。
- 新增运行时与类型测试。

## 3.0.1 (2026-08-29)

### 文档

- 修正 CJS `require()` 的错误码描述：原写 `ERR_REQUIRE_ESM`，实测为 `ERR_PACKAGE_PATH_NOT_EXPORTED`
  （`exports` 未声明 `require` 条件）。CHANGELOG 与 README 两处同步修正。

## 3.0.0 (2026-08-29)

### 破坏性变更

- **移除 CommonJS 产物**。包改为纯 ESM：`"type": "module"`，`exports` 只保留 `import` 条件。
  仍使用 CJS 主进程的项目，需要二选一：把主进程改为 ESM，或把本包交给打包器（electron-builder / vite / esbuild）一起编译。
  直接 `require('@quiteer/electron-ipc')` 会抛 `ERR_PACKAGE_PATH_NOT_EXPORTED`（`exports` 里没有 `require` 条件）。
- **产物路径变化**：`dist/index.mjs`、`web/index.mjs` 不再产出，统一为 `dist/index.js` 与 `web/index.js`，类型文件为 `.d.ts`。

### 修复

- `__file_options__` 通道传参错误。原实现把参数数组整体作为单个实参传给 `path.join` 等方法，
  导致 `invoke('__file_options__', 'join', a, b)` 抛错，现改为展开传参。
- `setFullScreen` 事件缺少 `flag: boolean` 参数声明，渲染层调用时拿不到类型提示。

### 其他

- 构建器由 tsup 迁移到 tsdown（rolldown）。
- 开发环境 electron 升级至 `^44`，类型按新的 `.d.ts` 适配。
- 文档重写：补齐两个内置通道的完整枚举表格、渲染层 `ExpandPreloadIpc` 类型增强、
  与 `@quiteer/electron-browser` 的 `fromWebContents` 配合定位来源窗口的示例。
- 补齐 `repository` / `homepage` / `bugs` 元数据。
