# @quiteer/electron-ipc

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
