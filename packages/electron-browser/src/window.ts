import { BrowserWindow } from 'electron';

import type { WindowController, WindowOptions } from './types';

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

/** 创建一个窗口并返回控制句柄 (不注册到仓库) */
export function createWindow<N extends string>(options: WindowOptions<N>): WindowController<N> {
  const { name, url, openDevTools, showOnReady = true, ...winOptions } = options;

  const win = new BrowserWindow(winOptions);
  const controller = toController(win, name);

  if (url) {
    void win.loadURL(url);
  }
  if (openDevTools) {
    win.webContents.openDevTools();
  }
  if (showOnReady && !winOptions.show) {
    win.once('ready-to-show', () => !win.isDestroyed() && win.show());
  }

  return controller;
}
