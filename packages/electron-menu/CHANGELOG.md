# @quiteer/electron-menu

## 0.0.2 (2026-08-29)

### 文档

- 补全 `MenuStore` 方法列表：`size` / `names()` / `list()` / `entries()` / `get()` /
  `getController()` / `find()` / `has()` / `remove()` / `clear()` / `destroyAll()`。
- 补充摘除语义：与窗口、托盘不同，`Menu` 没有销毁概念，
  `remove()` / `clear()` / `destroyAll()` 都只摘除注册，不会改动菜单本身。

## 0.0.1 (2026-08-29)

首次发布。

封装 Electron 原生 `Menu`（不是托盘的 `contextMenu`），覆盖 application / context / dock 三种场景：

- `MenuManager`：`create` / `register` / `get` / `getController` / `getOrThrow` / `has` /
  `popup` / `update` / `refresh` / `destroy` / `destroyAll`，各方法统一返回 `boolean` 表示是否命中。
- `MenuController`：按点分路径定位菜单项（`'file.save'`）。未显式设置 `id` 的项按层级位置
  自动生成路径（顶级第 0 项 → `'0'`，其子第 1 项 → `'0.1'`）。
  支持响应式读写菜单项属性，写入后按平台自动刷新——macOS 原生生效，
  Windows / Linux 自动重新 `setApplicationMenu`。
- 模板 100% 兼容原生 `MenuItemConstructorOptions[]`，仅多一个可选 `id`，不引入任何 DSL。
  `update(path, patch)` 局部更新并保留实例，`refresh()` 按模板重建（函数模板会重新求值）。
- 三场景：`application`（自动 `setApplicationMenu`）/ `context`（`popup({ window, x, y })`）/
  `dock`（`app.dock?.setMenu`，非 macOS 跳过）。
- `MenuStore` 持有引用，避免菜单与快捷键被 GC 回收后失效。
- 纯 ESM，构建器 tsdown。
- 15 个单元测试覆盖路径定位、局部更新、模板重建与三类场景。
