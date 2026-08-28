# @quiteer/electron-tray

Electron 主进程系统托盘管理：统一注册、随处取用、图标状态切换、菜单与事件一把梭。

## 安装

```bash
pnpm add @quiteer/electron-tray
```

## 快速开始

```ts
import { trays } from '@quiteer/electron-tray'
import { app } from 'electron'

const tray = trays.create({
  name: 'main',
  icon: {
    idle: 'resources/tray.png',
    syncing: 'resources/tray-syncing.png'
  },
  tooltip: '我的应用',
  contextMenu: [
    { label: '退出', click: () => app.quit() }
  ],
  onClick: ({ tray }) => tray.state = 'syncing'
})

// 任意位置、任意时刻按名取用
trays.get('main')?.setToolTip('同步中')
trays.setState('main', 'syncing')
```

## 图标状态

图标可以是一组状态表，写 `state` 即自动换图标，不用自己管 `NativeImage`：

```ts
const tray = trays.create({
  name: 'app',
  icon: { idle: 'a.png', syncing: 'b.png', error: 'c.png' },
  initialState: 'idle' // 省略则取第一个 key
})

tray.state = 'syncing' // 换图标
tray.state // 'syncing'
tray.icon = 'custom.png' // 也可以临时换单个图标
```

图标来源支持文件路径、`data:` URL 与 `NativeImage`，并按需要归一化：

```ts
trays.create({
  name: 'app',
  icon: 'resources/tray.png',
  iconSize: { width: 16, height: 16 }, // 统一缩放
  templateIcon: true // macOS 模板图, 自动适配明暗色
})
```

## 名称与状态类型安全

```ts
// trays.ts
import { createTrayManager } from '@quiteer/electron-tray'

export const trays = createTrayManager<'main' | 'second', 'idle' | 'busy'>()

trays.create({ name: 'main', icon: { idle: 'a.png', busy: 'b.png' } })
trays.setState('main', 'busy') // ✅ 有补全
trays.setState('main', 'sleep') // ❌ 类型报错
```

## 响应式属性

托盘句柄在 `Tray` 之上补充了一组可直接读写的属性：

| 属性 | 读 | 写 |
| --- | --- | --- |
| `state` | 当前状态名 | 切换状态并换图标 |
| `icon` | 当前图标来源 | 直接换图标 |
| `tooltip` | 本地记录的提示文本 | `setToolTip()` |
| `title` | `getTitle()` | `setTitle()` |
| `menu` | 当前 `Menu` 实例 | 传模板 / `Menu` / `null` 更新右键菜单 |

其余属性与方法全部透传 `Tray`（方法已绑定 `this`），原始实例通过 `controller.target` 获取。

## 菜单

菜单模板支持传数组，也支持传函数——函数形式下每次 `refreshMenu()` 都会重新求值，适合带勾选状态、动态列表的菜单：

```ts
let paused = false

const tray = trays.create({
  name: 'main',
  icon: 'tray.png',
  contextMenu: () => [
    { label: paused ? '继续' : '暂停', click: () => paused = !paused },
    { type: 'separator' },
    { label: '退出', role: 'quit' }
  ]
})

paused = true
tray.refreshMenu() // 重新求值并 setContextMenu
```

## 创建选项

| 选项 | 类型 | 说明 |
| --- | --- | --- |
| `name` | `string` | **必填**，托盘唯一标识 |
| `icon` | `TrayIconSource \| Record<状态, TrayIconSource>` | **必填**，图标来源或状态表 |
| `initialState` | `string` | 初始状态，省略取第一个 key |
| `tooltip` | `string` | 悬停提示 |
| `title` | `string` | 图标旁文本（macOS） |
| `pressedIcon` | `TrayIconSource` | 按下态图标（macOS） |
| `iconSize` | `Size` | 图标统一缩放尺寸 |
| `templateIcon` | `boolean` | macOS 模板图模式 |
| `contextMenu` | 模板数组 / 函数 | 右键菜单 |
| `ignoreDoubleClick` | `boolean` | 忽略双击中的首次点击 |
| `popupOnClick` | `boolean` | 左键点击时手动弹菜单，默认 `false` |
| `conflict` | `'reuse' \| 'recreate' \| 'error'` | 同名托盘已存在时的策略，默认 `reuse` |
| `guid` | `string` | 托盘唯一标识，用于固定图标位置（Windows） |
| `onClick` / `onDoubleClick` / `onRightClick` / `onMiddleClick` | 回调 | 点击类事件，回调第一参为上下文 |
| `onBalloonClick` / `onBalloonShow` / `onBalloonClosed` | 回调 | 气泡事件（Windows） |
| `onDropFiles` | 回调 | 文件拖放（macOS） |

点击回调签名：

```ts
onClick(ctx, event, bounds, position) // click 带事件坐标
onDoubleClick(ctx, event, bounds) // double-click / right-click / middle-click 无坐标
```

`ctx` 含 `{ name, state, tray }`，其中 `tray` 是控制器自身，可直接改状态：

```ts
trays.create({
  name: 'main',
  icon: { idle: 'a.png', syncing: 'b.png' },
  onClick: ({ tray }) => tray.state = 'syncing'
})
```

## API

### `TrayManager`

| 方法 | 说明 |
| --- | --- |
| `create(options)` | 创建托盘并注册，返回控制句柄 |
| `register(name, tray)` | 把外部创建的 `Tray` 纳入管理 |
| `get(name)` | 按名取原生 `Tray`，无则 `undefined` |
| `getController(name)` | 按名取带响应式属性的句柄 |
| `getOrThrow(name)` | 按名取托盘，缺失时抛错 |
| `setState(name, state)` | 切换图标状态，不存在返回 `false` |
| `setIcon(name, icon)` | 直接换图标 |
| `setTooltip(name, text)` | 更新悬停提示 |
| `setMenu(name, menu)` | 更新右键菜单，传 `null` 清空 |
| `refreshMenu(name)` | 按模板重建菜单 |
| `balloon(name, options)` | 气泡通知，仅 Windows 生效，返回是否弹出 |
| `has(name)` | 托盘是否存在 |
| `destroy(name)` | 销毁托盘并摘除注册 |
| `destroyAll()` | 销毁所有托盘 |
| `list()` / `names()` / `size` | 托盘清单 |

### `TrayStore`

托盘仓库，可单独使用。持有托盘引用本身就是必要的——`Tray` 实例一旦被 GC，系统托盘图标会直接消失。

```ts
store.find((controller, name) => name === 'main') // 按条件查找
store.entries() // [name, controller][]
store.remove(name) // 摘除注册（不销毁托盘）
store.clear() // 清空注册表（不销毁托盘）
store.destroyAll() // 销毁并清空
```

控制句柄上的 `destroy()` 已覆写为「销毁 + 从仓库摘除」，调用后仓库里不会残留记录。

## 平台差异

| 能力 | 生效平台 | 未生效时 |
| --- | --- | --- |
| `title` / `pressedIcon` | macOS | 调用为空操作 |
| `balloon()` | Windows | 返回 `false`，不调用原生 API |
| `onDropFiles` | macOS | 不触发 |
| `guid` | Windows | 忽略 |

Linux 下部分桌面环境（尤其是 libappindicator）不会自动弹出托盘菜单，此时可开 `popupOnClick: true` 兜底。
