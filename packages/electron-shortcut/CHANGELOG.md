# @quiteer/electron-shortcut

## 0.1.0 (2026-10-27)

首次发布。

全局快捷键的按名注册与统一管理：

- `ShortcutManager`：`register` / `get` / `getOrThrow` / `enable` / `disable` / `setAccelerator` /
  `unregister` / `unregisterAll` / `suspend` / `resume` / `ownerOf` / `isRegistered`。
  同名冲突策略 `recreate`（默认）/ `reuse` / `error`。
- **冲突检测**：`globalShortcut.register` 返回 `false` 时抛出 `ShortcutError`，`reason` 区分
  `occupied`（被其他应用占用）/ `duplicate`（被本应用另一个快捷键占用，附 `owner`）/ `invalid`（写法非法）。
  多个组合时全部成功才算成功，失败自动回滚；传 `onError` 可改为回调。
- **按焦点启停**：`scope: 'focused'` 仅在应用有窗口聚焦时注册；`window` 绑定到具体窗口，
  同一组合可在不同窗口间交接；绑定的窗口关闭后自动注销。
- 句柄可直接读写 `accelerator` / `enabled` / `handler`，换绑失败回滚到旧组合。
- 应用未 ready 时延后注册，`will-quit` 时自动注销；只注销本管理器注册的组合，不误伤其他代码。
- 15 个单元测试。
