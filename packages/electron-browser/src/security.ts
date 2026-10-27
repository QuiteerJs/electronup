import { shell } from 'electron';
import type { BrowserWindow, WebPreferences } from 'electron';

import type { NavigationGuardOptions } from './types';

/** 安全相关的 webPreferences 默认值, 用户显式传入的字段优先 */
export const SECURE_WEB_PREFERENCES: Readonly<WebPreferences> = Object.freeze({
  contextIsolation: true,
  sandbox: true,
  nodeIntegration: false,
  webSecurity: true,
});

export function withSecureDefaults(prefs: WebPreferences | undefined): WebPreferences {
  return { ...SECURE_WEB_PREFERENCES, ...prefs };
}

/**
 * 统一的 origin 表示: `协议//主机[:端口]`
 *
 * 不用 `URL.origin`, 它对 file: 与自定义协议一律返回 `'null'`
 */
export function originOf(url: string): string | undefined {
  try {
    const { protocol, host } = new URL(url);
    return `${protocol}//${host}`;
  } catch {
    return undefined;
  }
}

const EXTERNAL_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);

function isExternalUrl(url: string): boolean {
  try {
    return EXTERNAL_PROTOCOLS.has(new URL(url).protocol);
  } catch {
    return false;
  }
}

/** 挂载 will-navigate 与 window.open 守卫 */
export function applyNavigationGuard(
  win: BrowserWindow,
  options: NavigationGuardOptions,
  initialUrl?: string,
): void {
  const allowed = new Set<string>();
  for (const origin of [...(options.allowedOrigins ?? []), initialUrl]) {
    const normalized = origin === undefined ? undefined : originOf(origin);
    if (normalized) {
      allowed.add(normalized);
    }
  }

  const isAllowed =
    options.allowNavigation ??
    ((url: string) => {
      const origin = originOf(url);
      return (
        origin !== undefined &&
        (allowed.has(origin) || origin === originOf(win.webContents.getURL()))
      );
    });

  win.webContents.on('will-navigate', (event) => {
    if (!isAllowed(event.url)) {
      event.preventDefault();
    }
  });

  const policy = options.windowOpen ?? 'deny';
  win.webContents.setWindowOpenHandler(
    typeof policy === 'function'
      ? policy
      : ({ url }) => {
          if (policy === 'external' && isExternalUrl(url)) {
            void shell.openExternal(url).catch((error: unknown) => {
              console.error(`[electron-browser] 无法打开外部链接 ${url}`, error);
            });
          }
          return { action: 'deny' };
        },
  );
}
