---
title: 自动更新
---

# {{ $frontmatter.title }}

electronup 内置了 [electron-updater](https://www.electron.build/auto-update)，并把常用的初始化逻辑包装成了三个导出：

| 导出 | 说明 |
| --- | --- |
| `initAutoUpdater(options?)` | 配置 electron-updater，可选地在应用启动后检查更新 |
| `checkForUpdates()` | 手动检查更新；未打包时返回 `null` |
| `autoUpdater` | electron-updater 实例的惰性代理，用于监听事件或做更细的控制 |

## 基本用法

在主进程 `app.whenReady()` 之后初始化：

```ts
import { autoUpdater, initAutoUpdater } from 'electronup'
import { app } from 'electron'

void app.whenReady().then(() => {
  // 在启动检查前订阅错误，避免遗漏初始化期间的事件
  autoUpdater.on('error', error => console.error('更新失败：', error))
  initAutoUpdater({
    checkOnStart: true,
    autoDownload: true,
    autoInstallOnAppQuit: true,
  })
})
```

`initAutoUpdater` 的可选参数：

| 参数 | 默认值 | 说明 |
| --- | --- | --- |
| `checkOnStart` | `true` | 初始化后立即检查更新；只有在 `app.isPackaged` 为 `true` 时才会真正发起请求 |
| `autoDownload` | `true` | 发现新版本后自动下载 |
| `autoInstallOnAppQuit` | `true` | 退出应用时安装已下载的更新 |
| `logger` | 无 | 兼容 electron-updater 的 logger |

`initAutoUpdater` 返回底层真实实例；导出的 `autoUpdater` 是访问该实例的惰性代理，两者不是同一个对象。建议在初始化前通过代理订阅事件：

```ts
import { autoUpdater } from 'electronup'

autoUpdater.on('update-available', (info) => {
  // 通知用户有新版本
  console.log('update available:', info.version)
})

autoUpdater.on('update-downloaded', () => {
  // 提示用户重启安装
})
```

手动检查更新：

```ts
import { checkForUpdates } from 'electronup'

// 开发环境返回 null，不会发起请求
const result = await checkForUpdates()
```

## 配置更新源

更新源来自 electron-builder 的 `publish` 配置，写在 `builderConfig` 中：

```ts
import { defineConfig } from 'electronup'

export default defineConfig({
  builderConfig: {
    publish: [
      { provider: 'github', owner: 'your-org', repo: 'your-app' },
    ],
  },
})
```

也可以使用 `generic`、`s3`、`spaces` 等 electron-builder 支持的 provider，具体字段请参考 [electron-builder 发布文档](https://www.electron.build/configuration/publish)。

打包时请确保产物中包含更新所需的元数据文件（例如 `latest.yml`），否则客户端无法检查更新。

## 打包注意事项

`electronup` 本身通常作为开发依赖安装，打包后的应用运行时不一定能解析到它。使用更新功能时，建议：

1. 在应用 `dependencies` 中安装 `electron-updater`，让 electron-builder 将其打进应用：

```bash
pnpm add electron-updater
```

2. 在 `electronup.config.ts` 中把 `electronup` 加入 `packConfig.noExternal`，让更新辅助代码进入主进程产物：

```ts
export default defineConfig({
  packConfig: {
    noExternal: ['electronup'],
  },
})
```

两步缺一不可：更新辅助代码在运行时才通过 `createRequire` 惰性加载 `electron-updater`，打包工具无法跟踪这类调用，即使把 `electron-updater` 也加入 `noExternal`，产物中仍会保留 `require("electron-updater")`。因此 `electron-updater` 必须作为应用的 `dependencies` 安装，否则运行时会报 `Cannot find module 'electron-updater'`。

### 平台产物要求

electron-updater 对不同平台的安装包类型有要求，调整 `builderConfig` 中的目标时请保留对应类型：

- Windows：使用 NSIS 安装包（electronup 默认的 `nsis` 配置）；`portable` 等目标不支持自动更新。
- macOS：使用 `zip` 更新包（`mac.target` 默认已包含 `zip`），且应用需要签名并公证。
- Linux：使用 `AppImage`、`rpm` 或 `deb` 产物。electron-builder 的 Linux 默认目标含 `snap`（不支持 electron-updater，且构建需要 snapcraft），建议显式配置 `linux: { target: ['AppImage'] }`。

## 开发环境行为

- `app.isPackaged` 为 `false` 时，`initAutoUpdater` 与 `checkForUpdates` 都不会发起更新检查。
- `initAutoUpdater` 会处理启动检查返回的 Promise 拒绝；electron-updater 的 `error` 事件和 logger 仍可记录失败。手动调用 `checkForUpdates` 时 Promise 会正常拒绝，需要自行捕获。
- `autoUpdater` 是惰性代理：访问属性时才真正初始化 electron-updater，因此在非 Electron 进程（例如构建期加载 `electronup.config.ts`）中仅导入 `electronup` 不会触发初始化。调用初始化函数或访问代理仍然要求 Electron 主进程环境。
- 需要自定义提示界面时，监听 `autoUpdater` 的事件即可，electronup 不提供内置 UI。

## 仓库示例与升级验收

`playground/electronup-test` 已配置生产依赖、`noExternal` 与 Linux 的 `AppImage` 目标，并在主进程订阅更新事件。构建时设置 `ELECTRONUP_UPDATE_URL` 可使用 generic 更新源；不设置时禁用发布配置，示例不会自动检查。只有存在打包器生成的 `app-update.yml` 时，示例才启用启动检查。

CI 在三个平台上分别执行两轮构建：

| 平台 | 构建命令 | 更新元数据 |
| --- | --- | --- |
| Windows | `build --win x64`（NSIS） | `latest.yml` |
| macOS | `build --mac`（dmg + zip，未签名） | `latest-mac.yml` |
| Linux | `build --linux x64`（AppImage） | `latest-linux.yml` |

先用 `--dir` 检查目录包内的更新器依赖（`electron-updater` 是生产依赖、位于应用内、更新辅助代码已内联进主进程）；再构建上表中的安装包，检查 `app-update.yml` 中的 provider 与更新地址，并核对元数据里的版本、每个安装包的大小和 SHA-512 哈希。Windows/macOS 的 `--dir` 不生成更新配置，目录打包通过不能证明自动升级可用。

在 Windows 上执行真实升级验收（以下为仓库根目录下的 PowerShell 命令）：

```powershell
pnpm --filter electronup build
$env:ELECTRONUP_UPDATE_URL = 'http://127.0.0.1:18080/'
$env:ELECTRONUP_UPDATE_VERSION = '1.0.0'
pnpm --filter electronup-test exec node ../../packages/electronup/dist/bin/electronup.mjs build --win x64
```

先安装生成的 `1.0.0` NSIS 安装包，然后退出应用。接着构建新版：

```powershell
$env:ELECTRONUP_UPDATE_VERSION = '1.0.1'
pnpm --filter electronup-test exec node ../../packages/electronup/dist/bin/electronup.mjs build --win x64
# 需要 Python 3；在单独的终端提供新版安装包、blockmap 与 latest.yml
python -m http.server 18080 --bind 127.0.0.1 --directory playground/electronup-test/dist/out
```

启动已安装的旧版，确认检测到 `1.0.1`、完成下载，退出后安装，再次启动时确认 `app.getVersion()` 为 `1.0.1`。还应检查同版本不更新，以及服务关闭时记录错误且应用仍可使用。版本环境变量仅覆盖验收产物，不修改仓库版本号；验收完成后移除两个环境变量。

本地 HTTP 地址仅用于本机验收；正式应用应配置实际的 HTTPS 更新源，并验证目标平台的签名、安装权限和更新文件访问。CI 当前不执行安装、重启和跨版本升级，这部分仍需在目标系统验收。
