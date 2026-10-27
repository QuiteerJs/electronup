# @quiteer/electron-tray

## 0.0.1 (2026-08-29)

首次发布。

系统托盘的创建与统一管理：

- `TrayManager`：`create` / `register` / `get` / `getController` / `getOrThrow` /
  `setState` / `setIcon` / `setTooltip` / `setMenu` / `refreshMenu` / `balloon` / `destroy` / `destroyAll`。
  同名托盘冲突策略 `reuse`（默认）/ `recreate` / `error`。
- `TrayStore`：name ↔ 托盘实例映射，覆写 `destroy()` 实现「销毁即摘除」——`Tray` 没有 `closed` 事件，
  不覆写会留下悬空引用。取用时校验 `isDestroyed()`。
- 句柄是 `Tray` 的代理：`state` / `icon` / `tooltip` / `title` / `menu` 可响应式读写，
  原始实例通过 `controller.target`（别名 `raw`）获取。
- **图标状态表**：写好状态 → 图标的映射后，赋值 `tray.state = 'syncing'` 即可自动换图；
  图标来源自动识别文件路径 / data URL / `NativeImage`，支持 `iconSize` 与 `templateIcon`。
- 菜单支持数组模板与函数模板，`refreshMenu()` 重新求值并重设。
- 平台兜底：`balloon` 仅 win32 有效（其他平台返回 `false`）；
  非 macOS 静默跳过 `title` / `pressedIcon`；Linux 使用 `popupOnClick`。
- 纯 ESM，构建器 tsdown。
- 18 个单元测试覆盖注册表、图标状态、平台分支与菜单重建。
