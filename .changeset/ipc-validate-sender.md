---
'@quiteer/electron-ipc': minor
---

内置通道校验调用来源

**新增**

- **内置通道校验调用来源**：`Ipc.init(options?)` 默认只接受主 frame 的调用，子 frame（含第三方 iframe）
  无法再让窗口 destroy / 最小化或调用路径通道。可选 `allowedOrigins` 限定页面来源（`file://` 按协议匹配），
  或用 `validateSender` 完全自定义。
- 导出 `IpcInitOptions` 类型。
- 声明 `peerDependencies.electron: >=30`、`engines.node: >=20`、`sideEffects: false`。
