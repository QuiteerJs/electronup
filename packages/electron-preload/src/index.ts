import { contextBridge } from 'electron';

import type { PreloadClipboard } from './clipboard';
import { $clipboard } from './clipboard';
import type { PreloadIpc, PreloadIpcEvent, PreloadIpcListener } from './ipcRenderer';
import { $ipc } from './ipcRenderer';
import type { PreloadWebFrame } from './webFrame';
import { $webFrame } from './webFrame';

contextBridge.exposeInMainWorld('$ipc', $ipc);
contextBridge.exposeInMainWorld('$clipboard', $clipboard);
contextBridge.exposeInMainWorld('$webFrame', $webFrame);

export type { PreloadIpc, PreloadIpcEvent, PreloadIpcListener, PreloadClipboard, PreloadWebFrame };
