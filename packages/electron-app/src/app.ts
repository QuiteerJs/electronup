import { BrowserWindow, app } from 'electron';

import { extractUrls, normalizeSchemes, registerProtocols } from './protocol';
import type {
  AppController,
  AppErrorPhase,
  AppOptions,
  OpenSource,
  QuitTask,
  SecondInstanceContext,
} from './types';

let current: AppController | undefined;

/**
 * 接管应用生命周期样板: 单实例、deep link、macOS activate、优雅退出
 *
 * 必须在主进程入口顶层同步调用 (不要放进 whenReady), 否则会错过 macOS 启动时的 open-url
 *
 * @example
 * ```ts
 * import { setupApp } from '@quiteer/electron-app'
 * import { windows } from '@quiteer/electron-browser'
 * import { trays } from '@quiteer/electron-tray'
 *
 * const lifecycle = setupApp({
 *   windows,
 *   mainWindow: 'main',
 *   createMainWindow: () => windows.create({ name: 'main', url: 'app://index.html' }),
 *   protocols: 'myapp',
 *   onOpenUrl: (url) => windows.get('main')?.webContents.send('deep-link', url),
 *   beforeQuit: [() => trays.destroyAll(), () => windows.closeAll()],
 * })
 * ```
 */
export function setupApp(options: AppOptions = {}): AppController {
  if (current) {
    throw new Error('[electron-app] setupApp 只能调用一次, 如需重新初始化请先调用 dispose()');
  }

  const {
    windows,
    mainWindow,
    createMainWindow,
    onReady,
    onOpenUrl,
    onOpenFile,
    onSecondInstance,
    quitOnAllWindowsClosed = process.platform !== 'darwin',
    quitTimeout = 5000,
    onError,
  } = options;

  if (typeof mainWindow === 'string' && !windows) {
    throw new TypeError('[electron-app] mainWindow 传窗口名时需要同时提供 windows');
  }

  const singleInstance =
    options.singleInstance === false
      ? undefined
      : options.singleInstance === true || options.singleInstance === undefined
        ? {}
        : options.singleInstance;
  const schemes = normalizeSchemes(options.protocols);
  const tasks: QuitTask[] =
    options.beforeQuit === undefined
      ? []
      : Array.isArray(options.beforeQuit)
        ? [...options.beforeQuit]
        : [options.beforeQuit];

  const listeners: [string, (...args: any[]) => void][] = [];
  /** ready 并创建主窗口之前收到的打开请求 */
  const pending: (() => void)[] = [];
  let ready = false;
  let disposed = false;
  let quitting = false;
  let quitState: 'idle' | 'running' | 'done' = 'idle';

  const report = (error: unknown, phase: AppErrorPhase): void => {
    if (onError) {
      onError(error, phase);
    } else {
      console.error(`[electron-app] ${phase} 阶段出错:`, error);
    }
  };

  /** 调用用户回调, 同步异常与 Promise 拒绝都交给 report */
  const invoke = async (fn: (() => unknown) | undefined, phase: AppErrorPhase): Promise<void> => {
    if (!fn) {
      return;
    }
    try {
      await fn();
    } catch (error) {
      report(error, phase);
    }
  };

  const listen = (event: string, listener: (...args: any[]) => void): void => {
    app.on(event as any, listener);
    listeners.push([event, listener]);
  };

  const getMainWindow = (): BrowserWindow | undefined => {
    const win =
      mainWindow === undefined
        ? BrowserWindow.getAllWindows()[0]
        : typeof mainWindow === 'string'
          ? windows!.get(mainWindow)
          : mainWindow();
    return win && !win.isDestroyed() ? win : undefined;
  };

  const focusMainWindow = (): boolean => {
    const win = getMainWindow();
    if (win) {
      if (win.isMinimized()) {
        win.restore();
      }
      if (!win.isVisible()) {
        win.show();
      }
      win.focus();
      return true;
    }
    if (createMainWindow) {
      void invoke(createMainWindow, 'create-window');
      return true;
    }
    return false;
  };

  /** ready 之前缓存, 之后直接分发 */
  const dispatch = (fn: () => void): void => {
    if (ready) {
      fn();
    } else {
      pending.push(fn);
    }
  };

  const openUrl = (url: string, source: OpenSource): void => {
    if (onOpenUrl) {
      dispatch(() => void invoke(() => onOpenUrl(url, { source }), 'open'));
    }
  };

  const quit = (): void => {
    quitting = true;
    app.quit();
  };

  const runTasks = async (): Promise<void> => {
    const all = (async () => {
      for (const task of tasks.slice()) {
        await invoke(task, 'quit');
      }
    })();

    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<void>((resolve) => {
      timer = setTimeout(() => {
        report(new Error(`清理任务超过 ${quitTimeout}ms 未完成, 强制退出`), 'quit');
        resolve();
      }, quitTimeout);
    });

    await Promise.race([all, timeout]);
    clearTimeout(timer);
  };

  const dispose = (): void => {
    if (disposed) {
      return;
    }
    disposed = true;
    for (const [event, listener] of listeners) {
      app.removeListener(event as any, listener);
    }
    listeners.length = 0;
    pending.length = 0;
    if (current === controller) {
      current = undefined;
    }
  };

  const isPrimary =
    singleInstance === undefined ||
    (singleInstance.additionalData === undefined
      ? app.requestSingleInstanceLock()
      : app.requestSingleInstanceLock(singleInstance.additionalData));

  const controller: AppController = {
    get isPrimary() {
      return isPrimary;
    },
    get isQuitting() {
      return quitting;
    },
    getMainWindow,
    focusMainWindow,
    onBeforeQuit: (task) => {
      tasks.push(task);
      return () => {
        const index = tasks.indexOf(task);
        if (index !== -1) {
          tasks.splice(index, 1);
        }
      };
    },
    quit,
    dispose,
  };
  current = controller;

  if (!isPrimary) {
    // 主实例会在 second-instance 里收到本进程的 argv, 这里直接退出即可
    quitting = true;
    app.quit();
    return controller;
  }

  registerProtocols(schemes);

  if (singleInstance) {
    listen(
      'second-instance',
      (_event: unknown, argv: string[], workingDirectory: string, additionalData: unknown) => {
        if (singleInstance.focus !== false) {
          focusMainWindow();
        }
        for (const url of extractUrls(argv, schemes)) {
          openUrl(url, 'second-instance');
        }
        if (onSecondInstance) {
          const ctx: SecondInstanceContext = { argv, workingDirectory, additionalData };
          void invoke(() => onSecondInstance(ctx), 'open');
        }
      },
    );
  }

  // macOS 的 deep link 与文件打开走事件, 可能早于 ready 触发
  listen('open-url', (event: Electron.Event, url: string) => {
    event.preventDefault();
    openUrl(url, 'open-url');
  });
  listen('open-file', (event: Electron.Event, path: string) => {
    event.preventDefault();
    if (onOpenFile) {
      dispatch(() => void invoke(() => onOpenFile(path, { source: 'open-file' }), 'open'));
    }
  });

  // Windows / Linux 首次启动时的 deep link 在 argv 里
  for (const url of extractUrls(process.argv, schemes)) {
    openUrl(url, 'launch');
  }

  // 一旦监听 window-all-closed, Electron 就不再默认退出, 需要自行处理
  listen('window-all-closed', () => {
    if (quitOnAllWindowsClosed && quitState === 'idle') {
      quit();
    }
  });

  listen('activate', () => {
    if (ready && quitState === 'idle' && BrowserWindow.getAllWindows().length === 0) {
      void invoke(createMainWindow, 'create-window');
    }
  });

  listen('before-quit', (event: Electron.Event) => {
    quitting = true;
    if (quitState === 'done') {
      return;
    }
    if (quitState === 'running') {
      event.preventDefault();
      return;
    }
    if (tasks.length === 0) {
      quitState = 'done';
      return;
    }

    event.preventDefault();
    quitState = 'running';
    void runTasks().finally(() => {
      quitState = 'done';
      app.quit();
    });
  });

  void app.whenReady().then(async () => {
    if (disposed) {
      return;
    }
    await invoke(onReady, 'ready');
    if (disposed || quitting) {
      return;
    }
    await invoke(createMainWindow, 'create-window');
    ready = true;
    for (const fn of pending.splice(0)) {
      fn();
    }
  });

  return controller;
}
