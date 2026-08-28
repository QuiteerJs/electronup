# @quiteer/electron-browser

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
