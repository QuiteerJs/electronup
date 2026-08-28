# @quiteer/electron-menu

Electron 主进程菜单管理：统一注册、随处取用、按路径定位菜单项、改动自动同步。

## 安装

```bash
pnpm add @quiteer/electron-menu
```

## 快速开始

```ts
import { menus } from '@quiteer/electron-menu'

menus.create({
  name: 'app',
  template: [
    {
      id: 'file',
      label: '文件',
      submenu: [
        { id: 'file.new', label: '新建', accelerator: 'CmdOrCtrl+N' },
        { type: 'separator' },
        { id: 'file.quit', label: '退出', role: 'quit' }
      ]
    },
    { label: '编辑', role: 'editMenu' }
  ]
})

// 任意位置、任意时刻按路径更新
menus.update('app', 'file.new', { enabled: false })
```

模板就是原生的 `MenuItemConstructorOptions[]`，只多了一个可选的 `id`，没有任何自定义 DSL。

## 路径定位

模板里的 `id` 支持点分路径，`'file.new'` 就是「file 菜单下的 new 项」，任意深度都成立：

```ts
const item = menus.item('app', 'file.new')!
item.enabled = false
item.label = '新建文档'
```

没写 `id` 的项会按层级位置自动生成：顶级第 0 项 → `'0'`，它的第 1 个子项 → `'0.1'`。所以即使一个 id 都不写，每一项也都能被定位到。

```ts
menus.create({
  name: 'app',
  template: [{ label: '文件', submenu: [{ label: '新建' }, { label: '保存' }] }]
})

menus.item('app', '0.1')?.label // '保存'
```

## 两种更新方式

| | 适合场景 | 行为 |
| --- | --- | --- |
| `update(path, patch)` | 改几项属性 | 局部写入，菜单实例不变，改动立即生效 |
| `refresh()` | 整体重建 | 按模板重新构建，模板为函数时重新求值 |

```ts
// 局部改, 适合开关/勾选态
menus.update('app', 'file.new', { enabled: false, checked: true })

// 整体重建, 适合列表型菜单
let paused = false

menus.create({
  name: 'app',
  template: () => [
    { id: 'toggle', label: paused ? '继续' : '暂停', click: () => { paused = !paused } }
  ]
})

paused = true
menus.refresh('app') // 重新求值
```

## 三种用途

| `kind` | 说明 | 创建后 |
| --- | --- | --- |
| `application`（默认） | 应用菜单 | 自动 `Menu.setApplicationMenu()` |
| `context` | 上下文菜单 | 不自动应用，需 `popup()` |
| `dock` | macOS 程序坞菜单 | 自动 `app.dock.setMenu()`，其他平台静默跳过 |

```ts
import type { BrowserWindow } from 'electron'

menus.create({
  name: 'editor',
  kind: 'context',
  template: [
    { id: 'copy', label: '复制', role: 'copy' },
    { id: 'paste', label: '粘贴', role: 'paste' }
  ]
})

function showContextMenu(win: BrowserWindow): void {
  menus.popup('editor', { window: win })
}
```

## 名称类型安全

```ts
// menus.ts
import { createMenuManager } from '@quiteer/electron-menu'

export const menus = createMenuManager<'app' | 'editor'>()

menus.create({ name: 'app', template: [] })
menus.create({ name: 'typo', template: [] }) // ❌ 类型报错
```

## 创建选项

| 选项 | 类型 | 说明 |
| --- | --- | --- |
| `name` | `string` | **必填**，菜单唯一标识 |
| `template` | 模板数组 / 函数 | 菜单模板，函数时 `refresh()` 重新求值 |
| `kind` | `'application' \| 'context' \| 'dock'` | 菜单用途，默认 `application` |
| `apply` | `boolean` | `application` / `dock` 是否在创建后立即应用，默认 `true` |
| `conflict` | `'reuse' \| 'recreate' \| 'error'` | 同名菜单已存在时的策略，默认 `reuse` |
| `window` | `BaseWindow` | `context` 菜单 `popup()` 的默认目标窗口 |

## API

### `MenuManager`

| 方法 | 说明 |
| --- | --- |
| `create(options)` | 创建菜单并注册，返回控制句柄 |
| `register(name, menu, kind?)` | 把外部 `Menu` 纳入管理 |
| `get(name)` | 按名取原生 `Menu` |
| `getController(name)` | 按名取控制句柄 |
| `getOrThrow(name)` | 按名取菜单，缺失时抛错 |
| `item(name, path)` | 按点分路径取菜单项句柄 |
| `update(name, path, patch)` | 按路径批量更新菜单项 |
| `refresh(name)` | 按模板重建菜单 |
| `apply(name)` | 重新应用菜单 |
| `popup(name, options?)` | 弹出上下文菜单 |
| `closePopup(name, window?)` | 关闭已弹出的菜单 |
| `has(name)` / `destroy(name)` / `destroyAll()` | 存在性 / 摘除注册 / 清空 |
| `list()` / `names()` / `size` | 菜单清单 |

### `MenuController`

| 成员 | 说明 |
| --- | --- |
| `name` / `kind` / `target` | 菜单名 / 用途 / 原生 `Menu` 实例 |
| `template` | 当前模板，可直接改写 |
| `item(path)` | 按路径取菜单项句柄 |
| `update(path, patch)` | 按路径更新 |
| `items()` | 顶级菜单项句柄 |
| `get(id)` | 按 id 查找（等价原生 `getMenuItemById`，任意层级） |
| `append(item)` / `insert(pos, item)` | 追加 / 插入菜单项 |
| `refresh()` | 按模板重建 |
| `apply()` | 重新应用 |
| `popup(options?)` / `closePopup(window?)` | 弹出 / 关闭 |
| `on/once/off(event, listener)` | 监听 `menu-will-show` / `menu-will-close` |
| `destroy()` | 摘除注册 |

### `MenuItemHandle`

菜单项句柄，读写属性直接作用于原生 `MenuItem`：
`label` / `sublabel` / `enabled` / `visible` / `checked` / `accelerator` / `icon` / `toolTip` / `click`。

外加 `target`（原生菜单项）、`path`（定位路径）、`update(patch)`（批量更新）。

### `MenuStore`

菜单仓库，可单独使用。持有引用本身是必要的——`Menu` 实例一旦被回收，已应用的菜单与已注册的快捷键都会失效。

```ts
store.find((controller, name) => name.startsWith('context'))
store.entries()
store.remove(name)
store.clear()
```

## 平台差异

菜单项属性改动后的生效方式不同，包内已封装，无需关心：

| 平台 | 行为 |
| --- | --- |
| macOS | 改动自动同步到原生菜单 |
| Windows / Linux | 自动重新 `setApplicationMenu()` 使改动生效 |

`dock` 菜单仅 macOS 存在，其他平台 `app.dock?.setMenu()` 静默跳过。
