import { fileURLToPath } from 'node:url';

import { setupApp } from '@quiteer/electron-app';
import { windows } from '@quiteer/electron-browser';
import { channelsOf, createEmitter, handleContract, Ipc } from '@quiteer/electron-ipc';
import { createPreload } from '@quiteer/electron-preload/main';
import { app } from 'electron';

import { api } from './shared/api';

const indexHtml = fileURLToPath(new URL('../index.html', import.meta.url));
// 只放行本地页面; 开发时接 dev server 的话把它的 origin 加进来
const allowedOrigins = ['file://'];
// `pnpm smoke`: 页面自检完成后按结果退出, 用来确认示例没有跑坏
const smoke = process.argv.includes('--smoke');

const emitter = createEmitter(api);
let timer: NodeJS.Timeout | undefined;

setupApp({
  windows,
  mainWindow: 'main',
  onReady: () => {
    // 内置通道: 窗口控制 / 路径处理
    Ipc.init({ allowedOrigins });
    // 业务通道: 按契约实现, 漏写或签名不符都会类型报错
    handleContract(
      api,
      {
        invoke: {
          'app:info': () => ({
            name: app.getName(),
            version: app.getVersion(),
            platform: process.platform,
          }),
          'math:add': (_ctx, a, b) => a + b,
        },
        send: {
          'app:log': (ctx, message) => {
            console.error(`[renderer#${ctx.window?.id}] ${message}`);
          },
        },
      },
      { allowedOrigins },
    );
    timer = setInterval(() => emitter.broadcast('clock:tick', new Date().toISOString()), 1000);
  },
  createMainWindow: () => {
    const win = windows.create({
      name: 'main',
      width: 900,
      height: 640,
      show: !smoke,
      file: indexHtml,
      webPreferences: {
        // browser 已默认 sandbox / contextIsolation; 白名单直接从契约推导
        ...createPreload({ channels: channelsOf(api), clipboard: true }),
      },
    });
    if (smoke) {
      void runSmoke(win.webContents);
    }
    return win;
  },
  beforeQuit: [() => clearInterval(timer), () => windows.closeAll()],
});

async function runSmoke(contents: Electron.WebContents): Promise<void> {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 200));
    if (contents.isDestroyed() || contents.isLoading()) {
      continue;
    }
    const status: unknown = await contents.executeJavaScript('document.body.dataset.smoke');
    if (typeof status === 'string') {
      console.error(`[smoke] ${status}`);
      // 自检结束直接按结果退出, 不走 lifecycle.quit() 的清理流程
      app.exit(status === 'ok' ? 0 : 1);
      return;
    }
  }
  console.error('[smoke] 超时');
  app.exit(1);
}
