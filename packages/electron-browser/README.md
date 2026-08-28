# @quiteer/electron-browser

Electron 主进程窗口管理：统一注册、随处取窗、响应式操作。

## 安装

```bash
pnpm add @quiteer/electron-browser
```

## 快速开始

```ts
import { windows } from '@quiteer/electron-browser'

// 创建并注册
const main = windows.create({
  name: 'main',
  width: 1200,
  height: 800,
  url: 'https://example.com'
})

main.title = '我的应用' // 直接改属性即可
main.centered = true

// 任意位置、任意时刻按名取窗
windows.get('main')?.webContents.send('ping')
windows.focus('main')
```

## 窗口名称类型安全

```ts
// windows.ts
import { createWindowManager } from '@quiteer/electron-browser'

export const windows = createWindowManager<'main' | 'settings'>()

windows.create({ name: 'main' })
windows.get('settings') // ✅ 有补全
windows.get('setting') // ❌ 类型报错
```

## 响应式属性

窗口句柄在 `BrowserWindow` 之上补充了一组可直接读写的属性，读写都会同步到真实窗口：

| 属性 | 读 | 写 |
| --- | --- | --- |
| `width` / `height` | `getSize()` | `setSize()`，只改一边不影响另一边 |
| `x` / `y` | `getPosition()` | `setPosition()` |
| `title` | `getTitle()` | `setTitle()` |
| `visible` | `isVisible()` | `show()` / `hide()` |
| `centered` | — | 置 `true` 触发 `center()` |

其余属性与方法全部透传 `BrowserWindow`（方法已绑定 `this`），原始实例通过 `controller.target` 获取。

## 创建选项

在 `BrowserWindowConstructorOptions` 基础上扩展：

| 选项 | 类型 | 说明 |
| --- | --- | --- |
| `name` | `string` | **必填**，窗口唯一标识 |
| `url` | `string` | 创建后立即 `loadURL` |
| `openDevTools` | `boolean` | 创建后立即打开开发者工具 |
| `showOnReady` | `boolean` | 未显式 `show: true` 时，在 `ready-to-show` 后自动显示，默认 `true` |
| `conflict` | `'focus' \| 'recreate' \| 'error'` | 同名窗口已存在时的策略，默认 `focus` |

## API

### `WindowManager`

| 方法 | 说明 |
| --- | --- |
| `create(options)` | 创建窗口并注册，返回控制句柄 |
| `register(name, win)` | 把外部创建的窗口纳入管理 |
| `get(name)` | 按名取 `BrowserWindow`，无则 `undefined` |
| `getController(name)` | 按名取带响应式属性的句柄 |
| `getOrThrow(name)` | 按名取窗，缺失时抛错 |
| `has(name)` | 窗口是否存在 |
| `focus(name)` | 还原并聚焦，不存在返回 `false` |
| `close(name)` | 关闭窗口，不存在返回 `false` |
| `closeAll()` | 关闭全部窗口（Promise，等所有 `closed` 完成） |
| `broadcast(channel, ...args)` | 向所有窗口广播消息 |
| `list()` / `names()` / `size` | 窗口清单 |

### `WinStore`

窗口仓库，可单独使用。窗口 `closed` 时自动摘除映射，取窗时校验 `isDestroyed()`，不会拿到已销毁的窗口。

```ts
store.fromId(id) // 按窗口 id 反查句柄
store.fromWebContents(webContents) // ipc 回调里定位来源窗口
store.getName(win) // 按实例反查名称
store.entries() // [name, controller][]
store.remove(name) // 摘除注册（不关闭窗口）
store.clear() // 清空注册表
```
