import { pathToFileURL } from 'node:url';

import { BrowserWindow } from 'electron';

import { applyNavigationGuard, withSecureDefaults } from './security';
import { fitToDisplays, getDefaultStateStorage, trackWindowState } from './state';
import type { WindowController, WindowOptions, WindowStateStorage } from './types';

/**
 * 把 BrowserWindow 包装成带响应式属性的控制句柄
 *
 * - 读 `width` / `height` / `x` / `y` / `title` / `visible` 实时取自窗口
 * - 写上述属性 (以及 `centered`) 直接作用到窗口
 * - 其余属性与方法透传 BrowserWindow, 方法自动绑定 this
 */
export function toController<N extends string>(win: BrowserWindow, name: N): WindowController<N> {
  return new Proxy(win, {
    get(target, key) {
      switch (key) {
        case 'name':
          return name;
        case 'target':
        case 'raw':
          return target;
        case 'width':
          return target.getSize()[0];
        case 'height':
          return target.getSize()[1];
        case 'x':
          return target.getPosition()[0];
        case 'y':
          return target.getPosition()[1];
        case 'title':
          return target.getTitle();
        case 'visible':
          return target.isVisible();
        case 'centered':
          return undefined;
      }

      const value = Reflect.get(target, key, target);
      return typeof value === 'function' ? value.bind(target) : value;
    },

    set(target, key, value) {
      switch (key) {
        case 'name':
        case 'target':
        case 'raw':
          return false;
        case 'width': {
          const [, height] = target.getSize();
          target.setSize(value, height);
          return true;
        }
        case 'height': {
          const [width] = target.getSize();
          target.setSize(width, value);
          return true;
        }
        case 'x':
        case 'y': {
          const [x, y] = target.getPosition();
          target.setPosition(key === 'x' ? value : x, key === 'y' ? value : y);
          return true;
        }
        case 'title':
          target.setTitle(value);
          return true;
        case 'visible':
          if (value) {
            target.show();
          } else {
            target.hide();
          }
          return true;
        case 'centered':
          if (value) {
            target.center();
          }
          return true;
      }

      Reflect.set(target, key, value, target);
      return true;
    },

    has(target, key) {
      return key === 'name' || key === 'target' || Reflect.has(target, key);
    },
  }) as unknown as WindowController<N>;
}

function resolvePersist(
  option: WindowOptions['persistState'],
  name: string,
): { key: string; storage: WindowStateStorage } | undefined {
  if (!option) {
    return undefined;
  }
  const { key = name, storage = getDefaultStateStorage() } = option === true ? {} : option;
  return { key, storage };
}

/**
 * 创建一个窗口并返回控制句柄 (不注册到仓库)
 *
 * - webPreferences 默认 contextIsolation / sandbox 开启、nodeIntegration 关闭
 * - 默认挂载导航守卫: 仅允许同源跳转, 拒绝 window.open
 * - `parent` 只接受 BrowserWindow, 按名指定请用 manager.create
 */
export function createWindow<N extends string>(options: WindowOptions<N>): WindowController<N> {
  const {
    name,
    url,
    file,
    parent,
    openDevTools,
    showOnReady = true,
    conflict: _conflict,
    navigation = {},
    persistState,
    onLoadError,
    webPreferences,
    ...winOptions
  } = options;

  if (url && file) {
    throw new Error(`[electron-browser] 窗口 "${name}" 的 url 与 file 只能二选一`);
  }
  if (typeof parent === 'string') {
    throw new TypeError(
      `[electron-browser] 窗口 "${name}" 按名指定 parent "${parent}" 需通过 manager.create 创建`,
    );
  }

  const persist = resolvePersist(persistState, name);
  const saved = persist && persist.storage.get(persist.key);
  const restored = saved && fitToDisplays(saved);
  // 要恢复最大化 / 全屏时先隐藏创建, 避免先以普通尺寸闪一下
  const deferShow =
    winOptions.show === undefined &&
    showOnReady &&
    (restored?.isMaximized || restored?.isFullScreen);

  const win = new BrowserWindow({
    ...winOptions,
    ...(deferShow && { show: false }),
    ...(restored && {
      width: restored.width,
      height: restored.height,
      ...(restored.x !== undefined && { x: restored.x, y: restored.y }),
    }),
    ...(parent && { parent }),
    webPreferences: withSecureDefaults(webPreferences),
  });
  const controller = toController(win, name);

  if (navigation) {
    applyNavigationGuard(win, navigation, url ?? (file && pathToFileURL(file).href));
  }
  if (persist) {
    trackWindowState(win, persist.key, persist.storage);
  }

  const load = url ? win.loadURL(url) : file ? win.loadFile(file) : undefined;
  load?.catch((error: Error) => {
    if (onLoadError) {
      onLoadError(error, controller);
    } else {
      console.error(`[electron-browser] 窗口 "${name}" 加载失败`, error);
    }
  });

  if (openDevTools) {
    win.webContents.openDevTools();
  }

  const reveal = () => {
    if (win.isDestroyed()) {
      return;
    }
    if (restored?.isFullScreen) {
      win.setFullScreen(true);
    } else if (restored?.isMaximized) {
      win.maximize();
    }
    if (!win.isVisible()) {
      win.show();
    }
  };

  if (winOptions.show) {
    reveal();
  } else if (showOnReady) {
    win.once('ready-to-show', reveal);
  }

  return controller;
}
