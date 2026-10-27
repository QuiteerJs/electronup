import { windows } from '@quiteer/electron-browser';
import { Ipc } from '@quiteer/electron-ipc';
import { menus } from '@quiteer/electron-menu';
import { createPreload } from '@quiteer/electron-preload/main';
import { trays } from '@quiteer/electron-tray';
import { app } from 'electron';

// 1x1 的 PNG, 免得示例依赖图片文件
const ICON =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';

const pageUrl = new URL('./index.html', import.meta.url).href;

void app.whenReady().then(() => {
  Ipc.init();

  menus.create({
    name: 'app',
    template: [
      {
        id: 'file',
        label: '文件',
        submenu: [{ id: 'file.quit', label: '退出', role: 'quit' }],
      },
    ],
  });

  windows.create({
    name: 'main',
    width: 800,
    height: 600,
    url: pageUrl,
    // 冒烟测试要覆盖的正是这组推荐配置: sandbox 下预加载脚本只能拿到部分 electron 模块
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      ...createPreload({
        clipboard: true,
        // smoke:* 供冒烟测试从主进程推送消息
        channels: { on: ['smoke:*'] },
      }),
    },
  });

  trays.create({
    name: 'main',
    icon: { idle: ICON, busy: ICON },
    tooltip: 'electron-modules playground',
    contextMenu: [{ label: '退出', click: () => app.quit() }],
  });
});

app.on('window-all-closed', () => app.quit());

// 交给冒烟测试在主进程里检查各管理器的状态
Object.assign(globalThis, {
  playground: { windows, menus, trays, Ipc },
});
