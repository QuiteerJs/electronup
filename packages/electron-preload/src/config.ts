/**
 * 主进程与预加载脚本共用的运行时配置
 *
 * 配置由主进程 `createPreload()` 序列化进 `webPreferences.additionalArguments`,
 * 预加载脚本从 `process.argv` 读回; 页面无法篡改命令行参数, 所以白名单只能由主进程决定
 */

/** 通道白名单, 条目以 `*` 结尾时按前缀匹配, 如 `'user:*'` */
export interface PreloadChannels {
  /** `$ipc.send` / `$ipc.sendSync` 可用的通道 */
  send?: readonly string[];
  /** `$ipc.invoke` 可用的通道 */
  invoke?: readonly string[];
  /** `$ipc.on` / `$ipc.once` / `$ipc.removeAllListeners` 可用的通道 */
  on?: readonly string[];
}

export interface PreloadRuntimeConfig {
  channels: Required<{ [K in keyof PreloadChannels]: string[] }>;
  /** 是否暴露 `$clipboard` */
  clipboard: boolean;
}

export const ARG_PREFIX = '--quiteer-preload=';

/** `$clipboard` 走的内部通道, 由 `createPreload({ clipboard: true })` 在主进程注册 */
export const CLIPBOARD_CHANNEL = '__preload_clipboard__';

/** `@quiteer/electron-ipc` 的内置通道, 默认放行 */
export const BUILTIN_CHANNELS = {
  send: ['__window_options__'],
  invoke: ['__file_options__'],
  on: [],
} satisfies Required<PreloadChannels>;

/** 未经 `createPreload` 配置时的默认值: 只放行内置通道, 不暴露剪贴板 */
export const DEFAULT_CONFIG: PreloadRuntimeConfig = {
  channels: {
    send: [...BUILTIN_CHANNELS.send],
    invoke: [...BUILTIN_CHANNELS.invoke],
    on: [...BUILTIN_CHANNELS.on],
  },
  clipboard: false,
};

export function encodeConfig(config: PreloadRuntimeConfig): string {
  return ARG_PREFIX + encodeURIComponent(JSON.stringify(config));
}

const toStrings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];

/** 解析失败一律回落到默认值, 宁可少放行也不多放行 */
export function decodeConfig(argv: readonly string[]): PreloadRuntimeConfig {
  const arg = argv.find((item) => item.startsWith(ARG_PREFIX));
  if (!arg) {
    return DEFAULT_CONFIG;
  }
  try {
    const raw = JSON.parse(decodeURIComponent(arg.slice(ARG_PREFIX.length)));
    return {
      channels: {
        send: toStrings(raw?.channels?.send),
        invoke: toStrings(raw?.channels?.invoke),
        on: toStrings(raw?.channels?.on),
      },
      clipboard: raw?.clipboard === true,
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

/** 把白名单编译成判断函数: 精确匹配走 Set, `*` 结尾的条目按前缀匹配 */
export function createMatcher(patterns: readonly string[]): (channel: unknown) => boolean {
  const exact = new Set<string>();
  const prefixes: string[] = [];
  for (const pattern of patterns) {
    if (pattern.endsWith('*')) {
      prefixes.push(pattern.slice(0, -1));
    } else {
      exact.add(pattern);
    }
  }
  return (channel) =>
    typeof channel === 'string' &&
    (exact.has(channel) || prefixes.some((prefix) => channel.startsWith(prefix)));
}
