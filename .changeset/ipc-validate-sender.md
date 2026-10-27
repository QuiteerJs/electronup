---
'@quiteer/electron-ipc': minor
---

内置通道校验调用来源, 端到端类型安全的 IPC 契约

**新增**

- **内置通道校验调用来源**：`Ipc.init(options?)` 默认只接受主 frame 的调用，子 frame（含第三方 iframe）
  无法再让窗口 destroy / 最小化或调用路径通道。可选 `allowedOrigins` 限定页面来源（`file://` 按协议匹配），
  或用 `validateSender` 完全自定义。
- 导出 `IpcInitOptions` 类型。
- 声明 `peerDependencies.electron: >=30`、`engines.node: >=20`、`sideEffects: false`。
- 端到端类型安全的 IPC 契约：`defineContract` + `channel<F>()` 一处定义，
  主进程 `handleContract` / `createEmitter`、渲染层 `createClient`、preload 白名单 `api.channels` 都从契约推导。
- `channel` 支持任意 Standard Schema（zod / valibot 等）做参数校验，只在主进程边界执行。
- `handleContract` 的来源校验与 `Ipc.init` 一致：默认只接受主 frame，可选 `allowedOrigins` / `validateSender`。
- `channelsOf` 合并多个契约的白名单，`builtinChannels` 提供内置通道白名单。
