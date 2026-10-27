import { resolve } from 'node:path';

import { app } from 'electron';

/** 统一成小写且不带 `:` 的 scheme 列表 */
export function normalizeSchemes(protocols: string | string[] | undefined): string[] {
  const list = protocols === undefined ? [] : Array.isArray(protocols) ? protocols : [protocols];
  return [...new Set(list.map((item) => item.replace(/:.*$/, '').toLowerCase()))].filter(Boolean);
}

/**
 * 把应用注册为 scheme 的默认处理程序
 *
 * 开发模式 (`electron .` / `electron main.js`) 下 process.execPath 指向 electron 本体,
 * 必须带上入口脚本路径, 否则系统唤起时打开的是空白 electron
 */
export function registerProtocols(schemes: string[]): void {
  for (const scheme of schemes) {
    if (process.defaultApp && process.argv.length >= 2) {
      app.setAsDefaultProtocolClient(scheme, process.execPath, [resolve(process.argv[1])]);
    } else {
      app.setAsDefaultProtocolClient(scheme);
    }
  }
}

/** 从命令行参数里找出属于这些 scheme 的链接 (Windows / Linux 的 deep link 走 argv) */
export function extractUrls(argv: readonly string[], schemes: string[]): string[] {
  if (schemes.length === 0) {
    return [];
  }
  return argv.filter((arg) => {
    const lower = arg.toLowerCase();
    return schemes.some((scheme) => lower.startsWith(`${scheme}:`));
  });
}
