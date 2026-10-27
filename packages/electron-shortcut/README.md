# @quiteer/electron-shortcut

Electron 主进程全局快捷键管理：按名注册、冲突检测、按窗口焦点启停、退出自动注销。

## 安装

```bash
pnpm add @quiteer/electron-shortcut
```

## 快速开始

```ts
import { shortcuts } from '@quiteer/electron-shortcut';

shortcuts.register({
  name: 'toggle',
  accelerator: 'CmdOrCtrl+Shift+K',
  handler: () => console.error('pressed'),
});

// 任意位置按名取用
shortcuts.disable('toggle');
shortcuts.get('toggle')!.accelerator = 'Alt+Space'; // 换绑, 失败自动回滚
```

应用未 ready 时也可以直接注册，会在 ready 后自动生效；`will-quit` 时自动注销。

## 冲突检测

`globalShortcut.register` 被占用时只会静默返回 `false`，这里会抛出带原因的 `ShortcutError`：

```ts
import { ShortcutError, shortcuts } from '@quiteer/electron-shortcut';

try {
  shortcuts.register({ name: 'search', accelerator: 'Alt+Space', handler: openSearch });
} catch (error) {
  if (error instanceof ShortcutError) {
    error.reason; // 'occupied' 其他应用占用 | 'duplicate' 本应用另一个快捷键占用 | 'invalid' 写法非法
    error.owner; // reason 为 duplicate 时, 占用者的名称
  }
}

// 不想 try/catch 时传 onError
shortcuts.register({
  name: 'search',
  accelerator: ['Alt+Space', 'CmdOrCtrl+Shift+Space'], // 任一组合触发, 全部成功才算成功
  handler: openSearch,
  onError: (error) => notify(error.message),
});
```

## 按焦点启停

系统级快捷键会抢占其他应用的按键，很多快捷键只应在自己的窗口聚焦时生效：

```ts
import { windows } from '@quiteer/electron-browser';

// 应用任一窗口聚焦时生效
shortcuts.register({ name: 'find', accelerator: 'CmdOrCtrl+F', scope: 'focused', handler: find });

// 只在指定窗口聚焦时生效; 同一组合可分给不同窗口, 焦点切换时自动交接
shortcuts.register({
  name: 'save',
  accelerator: 'CmdOrCtrl+S',
  window: () => windows.get('editor'),
  handler: save,
});
```

`window` 传窗口实例时，窗口关闭后快捷键会自动注销。

## 响应式句柄

| 属性          | 读                         | 写                     |
| ------------- | -------------------------- | ---------------------- |
| `accelerator` | 当前组合列表               | 换绑, 失败回滚到旧组合 |
| `enabled`     | 是否启用                   | 启用 / 停用            |
| `handler`     | 当前回调                   | 替换回调               |
| `registered`  | 是否真正注册到了系统(只读) | -                      |

## 管理器 API

| 方法                                       | 说明                                      |
| ------------------------------------------ | ----------------------------------------- |
| `register(options)`                        | 注册快捷键, 返回句柄                      |
| `get(name)` / `getOrThrow(name)`           | 按名取句柄                                |
| `enable(name)` / `disable(name)`           | 启用 / 停用 (保留注册)                    |
| `setAccelerator(name, accelerator)`        | 换绑                                      |
| `unregister(name)` / `unregisterAll()`     | 注销并摘除                                |
| `suspend()` / `resume()`                   | 暂停 / 恢复全部, 适合「录制新快捷键」期间 |
| `ownerOf(accelerator)`                     | 当前占用该组合的快捷键名称                |
| `isRegistered(accelerator)`                | 该组合是否已被本应用注册                  |
| `has(name)` / `names()` / `list()`/ `size` | 查询                                      |

同名再次注册默认 `recreate`（替换旧绑定），可通过 `conflict: 'reuse' | 'error'` 调整。

## 名称类型安全

```ts
import { createShortcutManager } from '@quiteer/electron-shortcut';

export const shortcuts = createShortcutManager<'toggle' | 'save'>();

shortcuts.disable('toggle'); // ✅
shortcuts.disable('nope'); // ❌ 类型报错
```
