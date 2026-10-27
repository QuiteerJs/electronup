# @quiteer/electron-browser

## 0.1.0 (2026-10-27)

### 破坏性变更

- `create()` / `createWindow()` 的 `webPreferences` 默认 `contextIsolation: true`、`sandbox: true`、
  `nodeIntegration: false`、`webSecurity: true`，显式传入的字段优先。
- 默认挂载导航守卫：`will-navigate` 只放行同源（当前页面、初始 `url` / `file`、`allowedOrigins`），
  `window.open` / `target="_blank"` 默认拒绝。传 `navigation: false` 可恢复旧行为。

### 新功能

- `persistState`：记住窗口尺寸、位置、最大化与全屏状态，处理显示器拔出后的越界；
  默认存到 `userData/window-state.json`，可通过 `storage` 接入自定义存储。导出 `createFileStateStorage`。
- `navigation`：`allowedOrigins` / `allowNavigation` / `windowOpen`（`'deny'` / `'external'` / 自定义 handler）。
- `file` 选项：走 `loadFile` 加载本地 html，与 `url` 二选一。
- `parent` 支持在 `manager.create` 中按窗口名指定，父窗口不存在时抛错且不影响已有窗口。
- `onLoadError`：`url` / `file` 加载失败时回调，默认 `console.error`，不再产生未处理的 Promise 拒绝。
- 导出 `SECURE_WEB_PREFERENCES` 及 `NavigationGuardOptions` / `PersistStateOptions` / `WindowState` /
  `WindowStateStorage` / `WindowOpenPolicy` 类型。

### 其他

- `package.json` 声明 `peerDependencies.electron: >=30`、`sideEffects: false`、`engines.node: >=20`。

## 0.0.1 (2026-08-29)

首次发布。

包内原有的窗口创建逻辑重写为**窗口管理器**，目标是统一管理窗口、随时按名拿到实例：

- `WindowManager`：`create` / `register` / `get` / `getController` / `getOrThrow` / `has` /
  `focus` / `close` / `closeAll` / `broadcast` / `list` / `names`。
  同名窗口已存在时的策略可配置为 `focus`（默认，聚焦旧窗）/ `recreate`（关旧建新）/ `error`。
- `WinStore`：name ↔ id ↔ 窗口实例双向映射，窗口 `closed` 后自动摘除，
  支持 `fromId` / `fromWebContents` / `getName` / `entries` / `remove` / `clear` / `closeAll`，
  取窗时校验 `isDestroyed()`。
- 句柄是 `BrowserWindow` 的代理：`width` / `height` / `x` / `y` / `title` / `visible` / `centered`
  可直接读写，其余属性与方法透传且已绑定 `this`，原始实例通过 `controller.target`（别名 `raw`）获取。
- 提供全局单例 `windows` 与工厂 `createWindowManager<T>()`（泛型锁定窗口名）。
- 移除 `createBroseWindow.ts`。
- 纯 ESM（与 ipc 包一致，编译交给消费方主进程构建），构建器 tsdown。
- 11 个单元测试覆盖注册表、冲突策略与响应式读写。
