# playground/basic

把 `@quiteer/electron-app` / `electron-browser` / `electron-ipc` / `electron-preload` 串起来的最小可运行示例，全程 `sandbox: true`。

```bash
pnpm install
pnpm build                                  # 先构建 packages/*
pnpm --filter @quiteer/playground-basic start
```

窗口里能看到：

- **契约通道**：`app:info` / `math:add`（invoke）、`app:log`（send）、`clock:tick`（主进程每秒推送），定义在 [`src/shared/api.ts`](./src/shared/api.ts)，主进程与渲染层共用。
- **内置通道**：改当前窗口标题、调用 `path.join`，以及几个窗口控制按钮。
- **剪贴板**：`createPreload({ clipboard: true })` 后经主进程读写。
- **白名单**：调用未声明的通道会被预加载脚本直接拒绝。

| 文件                                       | 内容                                                                            |
| ------------------------------------------ | ------------------------------------------------------------------------------- |
| [`src/shared/api.ts`](./src/shared/api.ts) | `defineContract` 定义的 IPC 契约                                                |
| [`src/main.ts`](./src/main.ts)             | `setupApp` + `windows.create` + `Ipc.init` + `handleContract` + `createPreload` |
| [`src/renderer.ts`](./src/renderer.ts)     | `createClient(api)` 与 `window.$ipc` / `$clipboard` 的用法                      |
| [`src/global.d.ts`](./src/global.d.ts)     | 渲染层全局类型声明                                                              |
| [`vite.config.ts`](./vite.config.ts)       | 主进程打 ESM；渲染层把 `/web` 入口一起打成 IIFE 单文件                          |

## 自检

```bash
pnpm --filter @quiteer/playground-basic smoke
```

不弹窗口，页面把上面几项都跑一遍，全部通过时以 `0` 退出，否则以 `1` 退出并打印失败原因。没有显示器的 Linux 上可以套一层 `xvfb-run -a`；以 root 运行 Electron 还需要追加 `--no-sandbox`。
