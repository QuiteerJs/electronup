import fs from 'node:fs';
import path from 'node:path';

import { app, screen } from 'electron';
import type { BrowserWindow, Rectangle } from 'electron';

import type { WindowState, WindowStateStorage } from './types';

/** 窗口至少要有这么多像素落在某块屏幕里, 否则视为越界 */
const MIN_VISIBLE = 50;

const TRACKED_EVENTS = [
  'resize',
  'move',
  'maximize',
  'unmaximize',
  'enter-full-screen',
  'leave-full-screen',
] as const;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function parseState(value: unknown): WindowState | undefined {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }
  const raw = value as Record<string, unknown>;
  if (!isFiniteNumber(raw.width) || !isFiniteNumber(raw.height)) {
    return undefined;
  }
  const hasPosition = isFiniteNumber(raw.x) && isFiniteNumber(raw.y);
  return {
    ...(hasPosition ? { x: raw.x as number, y: raw.y as number } : {}),
    width: raw.width,
    height: raw.height,
    isMaximized: raw.isMaximized === true,
    isFullScreen: raw.isFullScreen === true,
  };
}

/**
 * 基于 JSON 文件的窗口状态存储
 *
 * @param file 默认 `app.getPath('userData')/window-state.json`, 首次读写时才解析
 */
export function createFileStateStorage(file?: string): WindowStateStorage {
  let cache: Record<string, WindowState> | undefined;
  const resolveFile = () => file ?? path.join(app.getPath('userData'), 'window-state.json');

  const load = (): Record<string, WindowState> => {
    if (cache) {
      return cache;
    }
    cache = {};
    try {
      const data: unknown = JSON.parse(fs.readFileSync(resolveFile(), 'utf8'));
      if (typeof data === 'object' && data !== null) {
        for (const [key, value] of Object.entries(data)) {
          const state = parseState(value);
          if (state) {
            cache[key] = state;
          }
        }
      }
    } catch {
      // 文件不存在或损坏, 视为空
    }
    return cache;
  };

  return {
    get: (key) => load()[key],
    set: (key, state) => {
      const all = load();
      all[key] = state;
      try {
        const target = resolveFile();
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, JSON.stringify(all, null, 2));
      } catch (error) {
        console.error('[electron-browser] 窗口状态写入失败', error);
      }
    },
  };
}

let defaultStorage: WindowStateStorage | undefined;

/** 进程内共享的默认文件存储 */
export function getDefaultStateStorage(): WindowStateStorage {
  return (defaultStorage ??= createFileStateStorage());
}

function overlap(a: Rectangle, b: Rectangle): [number, number] {
  const w = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  return [Math.max(0, w), Math.max(0, h)];
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

/**
 * 让保存的状态适配当前显示器布局
 *
 * - 仍有足够部分落在某块屏幕: 尺寸收进该屏工作区, 位置平移到屏内
 * - 已不在任何屏幕 (外接显示器被拔出等): 丢弃位置交给系统居中, 尺寸收进主屏
 */
export function fitToDisplays(state: WindowState): WindowState {
  const displays = screen.getAllDisplays();
  if (displays.length === 0) {
    return state;
  }

  const { x, y } = state;
  if (x !== undefined && y !== undefined) {
    const rect = { x, y, width: state.width, height: state.height };
    const display = displays.find((d) => {
      const [w, h] = overlap(rect, d.workArea);
      return w >= Math.min(MIN_VISIBLE, rect.width) && h >= Math.min(MIN_VISIBLE, rect.height);
    });
    if (display) {
      const area = display.workArea;
      const width = Math.min(rect.width, area.width);
      const height = Math.min(rect.height, area.height);
      return {
        ...state,
        width,
        height,
        x: clamp(x, area.x, area.x + area.width - width),
        y: clamp(y, area.y, area.y + area.height - height),
      };
    }
  }

  const area = screen.getPrimaryDisplay().workArea;
  return {
    width: Math.min(state.width, area.width),
    height: Math.min(state.height, area.height),
    isMaximized: state.isMaximized,
    isFullScreen: state.isFullScreen,
  };
}

function snapshot(win: BrowserWindow): WindowState {
  // 最大化 / 全屏时记录还原后的尺寸, 下次先按它创建再最大化
  const { x, y, width, height } = win.getNormalBounds();
  return { x, y, width, height, isMaximized: win.isMaximized(), isFullScreen: win.isFullScreen() };
}

/** 跟踪窗口状态, 在 close 时写入存储 */
export function trackWindowState(
  win: BrowserWindow,
  key: string,
  storage: WindowStateStorage,
): void {
  let state = snapshot(win);
  const update = () => {
    if (!win.isDestroyed()) {
      state = snapshot(win);
    }
  };

  for (const event of TRACKED_EVENTS) {
    win.on(event as 'resize', update);
  }
  win.on('close', () => {
    update();
    storage.set(key, state);
  });
}
