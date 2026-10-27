/**
 * 类型用例: 只参与类型检查, 不参与运行
 */
import type { WithIpcChannels } from '../src/web';

interface BaseIpc {
  send(channel: string, ...args: unknown[]): void;
  invoke<R = any>(channel: string, ...args: unknown[]): Promise<R>;
  on(channel: string, listener: (...args: any[]) => void): () => void;
}

declare const $ipc: WithIpcChannels<BaseIpc>;

$ipc.send('__window_options__', 'destroy');
$ipc.send('__window_options__', 'setTitle', '标题');
$ipc.send('business', { id: 1 });
$ipc.on('business', () => {});

export const joined: Promise<string> = $ipc.invoke('__file_options__', 'join', '/a', 'b');
export const custom: Promise<number> = $ipc.invoke<number>('business', 1);

// @ts-expect-error 未知操作
$ipc.send('__window_options__', 'not-exist');
// @ts-expect-error 漏传参数
$ipc.send('__window_options__', 'setTitle');
// @ts-expect-error 未知路径操作
void $ipc.invoke('__file_options__', 'nope');
