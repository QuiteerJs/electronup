# playground/smoke

用全部五个包拼出的最小 Electron 应用, 是 Playwright 冒烟测试的被测对象 (完整的接入示例见 [playground/basic](../basic))。

- 主进程: [src/main.js](./src/main.js), 按推荐配置 (`sandbox: true` + `contextIsolation: true`) 创建窗口, 并创建应用菜单与托盘
- 冒烟测试: [test/smoke.spec.ts](./test/smoke.spec.ts), 用 Playwright 的 `_electron.launch` 拉起应用

```bash
# 仓库根目录
pnpm build
pnpm --filter ./playground/smoke start   # 手动体验
pnpm test:e2e                            # 跑冒烟测试 (Linux 无桌面环境: xvfb-run -a pnpm test:e2e)
```
