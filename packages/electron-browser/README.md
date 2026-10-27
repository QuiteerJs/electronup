# @quiteer/electron-browser

Electron 主进程窗口管理：统一注册、随处取窗、响应式操作。

## 安装

```bash
pnpm add @quiteer/electron-browser
```

## 快速开始

```ts
import { windows } from '@quiteer/electron-browser';

// 创建并注册
const main = windows.create({
  name: 'main',
  width: 1200,
  height: 800,
  url: 'https://example.com',
});

main.title = '我的应用'; // 直接改属性即可
main.centered = true;

// 任意位置、任意时刻按名取窗
windows.get('main')?.webContents.send('ping');
windows.focus('main');
```

## 窗口名称类型安全

```ts
// windows.ts
import { createWindowManager } from '@quiteer/electron-browser';

export const windows = createWindowManager<'main' | 'settings'>();

windows.create({ name: 'main' });
windows.get('settings'); // ✅ 有补全
windows.get('setting'); // ❌ 类型报错
```

## 响应式属性

窗口句柄在 `BrowserWindow` 之上补充了一组可直接读写的属性，读写都会同步到真实窗口：

| 属性               | 读              | 写                                |
| ------------------ | --------------- | --------------------------------- |
| `width` / `height` | `getSize()`     | `setSize()`，只改一边不影响另一边 |
| `x` / `y`          | `getPosition()` | `setPosition()`                   |
| `title`            | `getTitle()`    | `setTitle()`                      |
| `visible`          | `isVisible()`   | `show()` / `hide()`               |
| `centered`         | —               | 置 `true` 触发 `center()`         |

其余属性与方法全部透传 `BrowserWindow`（方法已绑定 `this`），原始实例通过 `controller.target` 获取，`controller.raw` 是它的等价别名。

```ts
const main = windows.getController('main')!;

main.webContents.send('ping'); // 透传方法, 无需关心 this
main.target; // 原生 BrowserWindow
main.name; // 'main'
```

## 创建选项

在 `BrowserWindowConstructorOptions` 基础上扩展：

| 选项           | 类型                               | 说明                                                               |
| -------------- | ---------------------------------- | ------------------------------------------------------------------ |
| `name`         | `string`                           | **必填**，窗口唯一标识                                             |
| `url`          | `string`                           | 创建后立即 `loadURL`                                               |
| `file`         | `string`                           | 创建后立即 `loadFile`，与 `url` 二选一                             |
| `parent`       | `BrowserWindow \| string`          | 父窗口，`manager.create` 中可直接写窗口名                          |
| `openDevTools` | `boolean`                          | 创建后立即打开开发者工具                                           |
| `showOnReady`  | `boolean`                          | 未显式 `show: true` 时，在 `ready-to-show` 后自动显示，默认 `true` |
| `conflict`     | `'focus' \| 'recreate' \| 'error'` | 同名窗口已存在时的策略，默认 `focus`                               |
| `navigation`   | `NavigationGuardOptions \| false`  | 导航守卫，默认开启，见[安全默认值](#安全默认值)                    |
| `persistState` | `boolean \| PersistStateOptions`   | 记住窗口尺寸、位置与最大化状态，见[窗口状态记忆](#窗口状态记忆)    |
| `onLoadError`  | `(error, controller) => void`      | `url` / `file` 加载失败时回调，默认 `console.error`                |

| 策略            | 行为                                             |
| --------------- | ------------------------------------------------ |
| `focus`（默认） | 沿用旧窗口并聚焦，直接返回原句柄，不会创建新窗口 |
| `recreate`      | 关闭旧窗口后重建                                 |
| `error`         | 直接抛错，适合「只允许单例」的窗口               |

`register()` 同名注册时只覆盖映射，不会关闭旧窗口——外部创建的窗口生命周期由你自己负责。

```ts
const windows = createWindowManager<'main' | 'about'>();

windows.create({ name: 'main', file: path.join(__dirname, 'index.html') });
windows.create({ name: 'about', parent: 'main', modal: true, width: 400, height: 300 });
```

按名指定的父窗口不存在时直接抛错，且不会影响同名的已有窗口。

## 安全默认值

按 [Electron 安全清单](https://www.electronjs.org/docs/latest/tutorial/security)，`create()` 默认：

- `webPreferences` 以 `contextIsolation: true`、`sandbox: true`、`nodeIntegration: false`、`webSecurity: true` 为底，你显式传入的字段优先（可从 `SECURE_WEB_PREFERENCES` 读取这组默认值）。
- 挂载 `will-navigate` 守卫：只允许跳转到当前页面、初始 `url` / `file` 以及 `allowedOrigins` 的 origin，其余一律拦截。
- 挂载 `setWindowOpenHandler`：`window.open` 与 `target="_blank"` 默认拒绝。

```ts
windows.create({
  name: 'main',
  url: 'https://app.example.com',
  navigation: {
    // 允许跳转到登录页
    allowedOrigins: ['https://auth.example.com'],
    // 外链交给系统浏览器 (仅 http / https / mailto)
    windowOpen: 'external',
  },
});
```

| 字段              | 说明                                                                                         |
| ----------------- | -------------------------------------------------------------------------------------------- |
| `allowedOrigins`  | 额外允许的 origin，如 `https://example.com`、`file://`、`app://bundle`                       |
| `allowNavigation` | `(url) => boolean`，传入后取代默认的 origin 规则                                             |
| `windowOpen`      | `'deny'`（默认）/ `'external'` / 自定义 handler（等价于 `webContents.setWindowOpenHandler`） |

传 `navigation: false` 可完全关闭守卫。守卫只拦截页面发起的跳转，主进程里调用 `loadURL()` 不受影响。

## 窗口状态记忆

```ts
windows.create({ name: 'main', width: 1200, height: 800, persistState: true });
```

- 窗口关闭时记录还原后的尺寸、位置以及是否最大化 / 全屏，下次创建同名窗口时恢复；`width` / `height` 只作为首次启动的默认值。
- 恢复最大化 / 全屏时窗口先隐藏创建，`ready-to-show` 后再最大化显示，不会闪一下普通尺寸。
- 显示器布局变化时自动修正：窗口仍有部分落在某块屏幕上就整体挪回该屏工作区；原来的屏幕已经拔掉就丢弃位置交给系统居中，尺寸收进主屏。
- 默认存到 `app.getPath('userData')/window-state.json`，以窗口名为键。

```ts
import { createFileStateStorage } from '@quiteer/electron-browser';

windows.create({
  name: 'main',
  persistState: {
    key: 'main-v2', // 自定义存储键
    storage: createFileStateStorage('/path/to/state.json'), // 或任何实现了 get / set 的对象, 如 electron-store
  },
});
```

## API

### `WindowManager`

| 方法                          | 说明                                          |
| ----------------------------- | --------------------------------------------- |
| `create(options)`             | 创建窗口并注册，返回控制句柄                  |
| `register(name, win)`         | 把外部创建的窗口纳入管理                      |
| `get(name)`                   | 按名取 `BrowserWindow`，无则 `undefined`      |
| `getController(name)`         | 按名取带响应式属性的句柄                      |
| `getOrThrow(name)`            | 按名取窗，缺失时抛错                          |
| `has(name)`                   | 窗口是否存在                                  |
| `focus(name)`                 | 还原并聚焦，不存在返回 `false`                |
| `close(name)`                 | 关闭窗口，不存在返回 `false`                  |
| `closeAll()`                  | 关闭全部窗口（Promise，等所有 `closed` 完成） |
| `broadcast(channel, ...args)` | 向所有窗口广播消息                            |
| `list()` / `names()` / `size` | 窗口清单                                      |

### `WinStore`

窗口仓库，可单独使用。窗口 `closed` 时自动摘除映射，取窗时校验 `isDestroyed()`，不会拿到已销毁的窗口。

```ts
store.fromId(id); // 按窗口 id 反查句柄
store.fromWebContents(webContents); // 按 webContents（或其 id）反查
store.getName(win); // 按实例（或 id）反查名称
store.entries(); // [name, controller][]
store.remove(name); // 摘除注册（不关闭窗口）
store.clear(); // 清空注册表
store.closeAll(); // 关闭全部（等待 closed 后清空）
```

`fromWebContents()` 用于在 ipc 回调里定位来源窗口，配合自己定义的业务通道很顺手：

```ts
import { ipcMain } from 'electron';
import { windows } from '@quiteer/electron-browser';

ipcMain.on('custom', (event) => {
  const controller = windows.store.fromWebContents(event.sender);
  controller?.target.webContents.send('custom:reply', controller.name);
});
```
