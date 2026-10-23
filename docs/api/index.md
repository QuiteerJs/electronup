---
title: API
---

# {{ $frontmatter.title }}

`electronup` 包导出以下内容：

| 导出 | 类型 | 说明 |
| --- | --- | --- |
| `defineConfig` | 函数 | 配置类型提示 |
| `initAutoUpdater` | 函数 | 初始化 electron-updater |
| `checkForUpdates` | 函数 | 检查更新 |
| `autoUpdater` | 惰性代理 | 访问 electron-updater 实例 |
| `BuilderConfig` | 类型 | electron-builder 配置类型别名 |
| `ConfigEnv` | 类型 | 配置函数的参数类型 |
| `ElectronupConfig` | 类型 | 完整配置类型 |
| `PackConfig` | 类型 | `packConfig` 的类型 |
| `ViteConfig` | 类型 | `viteConfig` 的类型 |
| `AutoUpdaterOptions` | 类型 | `initAutoUpdater` 的参数类型 |

## `defineConfig`

> 类型辅助函数，原样返回传入的配置。

```ts
import { defineConfig } from 'electronup'

export default defineConfig({
  // ...
})
```

即使项目没有在 `package.json` 中开启 `"type": "module"`，也可以在配置文件里使用 ESM 语法。

### 情景配置

配置需要根据命令（`serve` / `build`）或项目根目录决定时，可以传入函数：

```ts
import { defineConfig } from 'electronup'

export default defineConfig(({ command, root }) => {
  if (command === 'serve') {
    return {
      // dev 独有配置
    }
  }

  return {
    // build 独有配置
  }
})
```

`command` 的取值为 `'serve'` 或 `'build'`，`root` 为命令行运行时的项目根目录。

### 异步配置

也可以返回 Promise 或使用异步函数：

```ts
export default defineConfig(async () => {
  const data = await loadConfig()
  return {
    // 配置
  }
})
```

::: tip
`ConfigEnv` 只包含 `command` 与 `root` 两个字段，没有 `mode`；需要读取环境变量时请在配置文件中自行加载。
:::

### 配置枚举（`ConfigEnv`）

```ts
interface ConfigEnv {
  command: 'build' | 'serve'
  root: string
}
```

## `initAutoUpdater`

> 配置 electron-updater 实例，可选地在应用启动后检查更新。

```ts
import { initAutoUpdater } from 'electronup'

initAutoUpdater({
  checkOnStart: true,
  autoDownload: true,
  autoInstallOnAppQuit: true,
  logger: undefined,
})
```

参数类型 `AutoUpdaterOptions`：

```ts
interface AutoUpdaterOptions {
  /** 初始化后是否立即检查更新，默认 true */
  checkOnStart?: boolean
  /** 发现更新后是否自动下载，默认 true */
  autoDownload?: boolean
  /** 退出应用时是否安装已下载的更新，默认 true */
  autoInstallOnAppQuit?: boolean
  /** 兼容 electron-updater 的 logger */
  logger?: typeof autoUpdater.logger
}
```

返回值是 electron-updater 的底层真实实例。建议在 `app.whenReady()` 之后调用。只有在 `app.isPackaged` 为 `true` 时才会在启动时发起检查。

## `checkForUpdates`

> 检查更新并按当前配置下载。

```ts
import { checkForUpdates } from 'electronup'

const result = await checkForUpdates()
```

未打包（`app.isPackaged === false`）时直接返回 `Promise<null>`，不会发起网络请求。

## `autoUpdater`

electron-updater 实例的惰性代理，用于监听事件或做更细粒度的控制。`initAutoUpdater` 返回底层真实实例，与此代理不是同一对象；建议在初始化前订阅事件：

```ts
import { autoUpdater } from 'electronup'

autoUpdater.on('update-available', (info) => {})
autoUpdater.on('update-downloaded', (info) => {})
autoUpdater.on('error', (error) => {})
```

事件与字段说明以 [electron-updater 文档](https://www.electron.build/auto-update) 为准。

## 配置相关类型

```ts
import type {
  AutoUpdaterOptions,
  BuilderConfig,
  ConfigEnv,
  ElectronupConfig,
  PackConfig,
  ViteConfig,
} from 'electronup'
```

各字段含义与默认值见[配置](/introduce/config)。
