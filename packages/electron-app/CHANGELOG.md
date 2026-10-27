# @quiteer/electron-app

## 0.1.0 (2026-10-27)

首次发布。

`setupApp()` 收拢每个项目都要写一遍的应用生命周期样板：

- **单实例锁**（默认开启）：拿不到锁的进程直接退出；`second-instance` 时还原并聚焦主窗口，
  主窗口不存在则调用 `createMainWindow`。主窗口可按名从 `@quiteer/electron-browser` 的 `windows` 取，
  但本包不依赖它。
- **deep link**：`protocols` 自动注册默认协议处理程序（含开发模式的入口路径处理），
  统一 macOS `open-url` 与 Windows / Linux 命令行参数，ready 之前收到的链接缓存到主窗口创建之后再分发。
  macOS `open-file` 交给 `onOpenFile`。
- **macOS activate**：点击 Dock 且没有窗口时重建主窗口。
- `window-all-closed`：默认非 macOS 退出，可配置。
- **优雅退出**：`beforeQuit` / `onBeforeQuit()` 注册清理任务，退出时依次执行、出错不中断、
  总超时（默认 5s）后强制退出；`isQuitting` 用于区分「隐藏到托盘」还是「真正关闭」。
- 16 个单元测试。
