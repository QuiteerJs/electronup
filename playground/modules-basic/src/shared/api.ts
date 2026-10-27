/**
 * 主进程与渲染层共享的 IPC 契约
 *
 * 只依赖 `@quiteer/electron-ipc/web`, 不引入 electron / node, 两端都能直接引用
 */
import { channel, defineContract } from '@quiteer/electron-ipc/web';

export interface AppInfo {
  name: string;
  version: string;
  platform: string;
}

export const api = defineContract({
  invoke: {
    'app:info': channel<() => AppInfo>(),
    'math:add': channel<(a: number, b: number) => number>(),
  },
  send: {
    'app:log': channel<(message: string) => void>(),
  },
  on: {
    'clock:tick': channel<(iso: string) => void>(),
  },
});
