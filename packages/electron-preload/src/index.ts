import { contextBridge } from 'electron';

import type { PreloadClipboard, PreloadClipboardData, PreloadClipboardType } from './clipboard';
import { $clipboard } from './clipboard';
import type { PreloadChannels } from './config';
import { decodeConfig } from './config';
import type { PreloadIpc, PreloadIpcEvent, PreloadIpcListener } from './ipcRenderer';
import { createIpc } from './ipcRenderer';
import type { PreloadWebFrame } from './webFrame';
import { $webFrame } from './webFrame';

// 沙箱预加载里 process 是受限版本, argv 仍可用
const config = decodeConfig(process.argv);

contextBridge.exposeInMainWorld('$ipc', createIpc(config));
contextBridge.exposeInMainWorld('$webFrame', $webFrame);
if (config.clipboard) {
  contextBridge.exposeInMainWorld('$clipboard', $clipboard);
}

export type {
  PreloadChannels,
  PreloadClipboard,
  PreloadClipboardData,
  PreloadClipboardType,
  PreloadIpc,
  PreloadIpcEvent,
  PreloadIpcListener,
  PreloadWebFrame,
};
