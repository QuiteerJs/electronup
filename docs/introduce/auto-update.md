---
title: 自动更新
---

# {{ $frontmatter.title }}

electronup 内置了 [electron-updater](https://www.electron.build/auto-update)，并把常用的初始化逻辑包装成了三个导出：

| 导出 | 说明 |
| --- | --- |
| `initAutoUpdater(options?)` | 配置 electron-updater，可选地在应用启动后检查更新 |
| `checkForUpdates()` | 手动检查更新；未打包时返回 `null` |
| `autoUpdater` | electron-updater 的原生实例，用于监听事件或做更细的控制 |

## 基本用法

在主进程 `app.whenReady()` 之后初始化：

```ts
import { initAutoUpdater } from 'electronup'
import { app } from 'electron'

void app.whenReady().then(() => {
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

返回值就是 `autoUpdater` 实例，可以直接继续监听事件：

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

如果你选择把 `electron-updater` 一起打进主进程产物，则第 1 步可以省略，但需要确认构建结果确实包含更新器代码。

### 平台产物要求

electron-updater 对不同平台的安装包类型有要求，调整 `builderConfig` 中的目标时请保留对应类型：

- Windows：使用 NSIS 安装包（electronup 默认的 `nsis` 配置）；`portable` 等目标不支持自动更新。
- macOS：使用 `zip` 更新包（`mac.target` 默认已包含 `zip`），且应用需要签名并公证。
- Linux：使用 `AppImage`、`rpm` 或 `deb` 产物。

## 开发环境行为

- `app.isPackaged` 为 `false` 时，`initAutoUpdater` 与 `checkForUpdates` 都不会发起更新检查。
- `initAutoUpdater` 内部的自动检查会忽略错误；手动调用 `checkForUpdates` 时错误会正常抛出，需要自行捕获。
- `autoUpdater` 是惰性实例：只有读取它的属性时才真正初始化 electron-updater，因此在非 Electron 进程（例如构建期加载 `electronup.config.ts`）中导入 `electronup` 不会触发初始化。
- 需要自定义提示界面时，监听 `autoUpdater` 的事件即可，electronup 不提供内置 UI。
