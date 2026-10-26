---
name: electronup-auto-update
description: 在 electronup 项目中接入 electron-updater 自动更新（initAutoUpdater、checkForUpdates、autoUpdater、builderConfig.publish、各平台更新产物）并排查更新失败。用户提到自动更新、热更新安装包、latest.yml、app-update.yml、electron-updater 或“打包后 Cannot find module 'electron-updater'”时使用。
---

# 接入自动更新

electronup 导出三个基于 electron-updater 的辅助 API：

| 导出 | 说明 |
| --- | --- |
| `initAutoUpdater(options?)` | 配置 updater，默认启动后检查；返回真实实例 |
| `checkForUpdates()` | 手动检查；未打包（`app.isPackaged === false`）时返回 `null` |
| `autoUpdater` | 真实实例的惰性代理，用来订阅事件 |

## 接入步骤（三步缺一不可）

1. 把 `electron-updater` 装进应用的 **dependencies**（不是 devDependencies）：

   ```bash
   pnpm add electron-updater
   ```

   辅助代码在运行时才 `require('electron-updater')`，打包工具跟踪不到，加 `noExternal` 也没用，必须作为生产依赖随应用分发。

2. `electronup.config.ts` 把 `electronup` 打进主进程产物，并配置更新源：

   ```ts
   import { defineConfig } from 'electronup'

   export default defineConfig({
     packConfig: {
       noExternal: ['electronup'],
     },
     builderConfig: {
       publish: [
         { provider: 'github', owner: 'your-org', repo: 'your-app' },
         // 或 { provider: 'generic', url: 'https://updates.example.com/' }
       ],
       linux: { target: ['AppImage'] },
     },
   })
   ```

3. 主进程在 `app.whenReady()` 之后初始化，先订阅事件再初始化：

   ```ts
   import { app } from 'electron'
   import { autoUpdater, initAutoUpdater } from 'electronup'

   void app.whenReady().then(() => {
     autoUpdater.on('error', error => console.error('更新失败：', error))
     autoUpdater.on('update-available', info => console.log('发现新版本', info.version))
     autoUpdater.on('update-downloaded', () => {
       // 提示用户重启；electronup 不提供内置 UI
     })
     initAutoUpdater({
       checkOnStart: true,        // 默认 true，仅打包后才真正请求
       autoDownload: true,        // 默认 true
       autoInstallOnAppQuit: true, // 默认 true
       // logger: 兼容 electron-updater 的 logger，可选
     })
   })
   ```

   手动检查时 Promise 会正常 reject，需要自己 `try/catch`：

   ```ts
   import { checkForUpdates } from 'electronup'

   try { await checkForUpdates() }
   catch (error) { console.error(error) }
   ```

- 只在 Electron 主进程里调用这些 API；不要在 `electronup.config.ts`、渲染进程或 preload 中调用（配置文件里只 import 不调用是安全的）。
- 如需直接使用 electron-updater 的其他属性（如 `channel`、`allowPrerelease`），通过 `autoUpdater` 代理读写即可。

## 平台产物要求

| 平台 | 构建 | 更新元数据 | 要求 |
| --- | --- | --- | --- |
| Windows | `electronup build --win x64`（NSIS，默认） | `latest.yml` | `portable` 不支持自动更新；正式发布建议签名（`verifyUpdateCodeSignature` 默认开启） |
| macOS | `electronup build --mac`（dmg + zip，默认） | `latest-mac.yml` | 必须保留 `zip`；应用需签名并公证，否则更新被系统拒绝 |
| Linux | `electronup build --linux x64` | `latest-linux.yml` | 用 `AppImage` / `deb` / `rpm`；snap 不支持 |

把安装包、`.blockmap` 与 `latest*.yml` 一起上传到 `publish` 指向的位置。Windows / macOS 的 `--dir` 构建不生成 `app-update.yml`，目录包通过不能证明自动更新可用。

## 验收

1. `electronup build --dir` 后检查未打包目录：`resources/app(.asar)` 中能找到 `node_modules/electron-updater`，且 `electron.cjs` 里已内联更新辅助代码（不是 `require("electronup")`）。
2. 构建安装包，确认 `resources/app-update.yml` 中 provider 与地址正确，`latest*.yml` 的版本号、文件大小、sha512 与产物一致。
3. 真实升级：安装旧版本 → 用更高版本号构建新包并放到更新源（本地可用 `python -m http.server` 配合 generic provider）→ 启动旧版确认检测、下载、退出后安装、重启后版本变化。构建成功不等于升级可用，没做这一步要明确告诉用户。

## 排查

| 现象 | 原因 |
| --- | --- |
| `Cannot find module 'electron-updater'` | 没装进 `dependencies` |
| `Cannot find module 'electronup'` | 没加 `packConfig.noExternal: ['electronup']` |
| 开发时不检查更新 | 预期行为：未打包时不发请求 |
| 客户端报找不到 `latest.yml` / 404 | 元数据没上传，或 `publish` 地址与上传位置不一致 |
| macOS 更新失败 | 缺 zip、未签名或未公证 |
| 构建配置阶段报 electron 相关错误 | 在配置文件或模块顶层调用了 updater API |

详细文档：<https://quiteerjs.github.io/electronup/introduce/auto-update>。
