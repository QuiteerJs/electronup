import { createClient, EventKeys, IpcWindowOptions } from '@quiteer/electron-ipc/web';

import { api } from './shared/api';

const client = createClient(api);
const $ = (id: string) => document.querySelector<HTMLElement>(`#${id}`)!;

function log(text: string): void {
  $('log').textContent += `${text}\n`;
}

async function main(): Promise<void> {
  // 1. 契约通道: 通道名、参数、返回值都有类型
  const info = await client.invoke('app:info');
  $('info').textContent = `${info.name} ${info.version} (${info.platform})`;
  const sum = await client.invoke('math:add', 1, 2);
  log(`math:add(1, 2) = ${sum}`);
  client.send('app:log', '页面已加载');

  client.on('clock:tick', (iso) => {
    $('clock').textContent = iso;
  });

  // 2. 内置通道: 改当前窗口标题、调用 node:path
  window.$ipc.send(
    EventKeys.WindowOptionsKey,
    IpcWindowOptions.SET_TITLE,
    'electron-modules playground',
  );
  const joined = await window.$ipc.invoke(EventKeys.FileOptionsKey, 'join', '/a', 'b', '../c');
  log(`path.join('/a', 'b', '../c') = ${joined}`);

  // 3. 剪贴板: 需 createPreload({ clipboard: true }), 经主进程执行
  await window.$clipboard?.writeText('hello from playground');
  log(`clipboard = ${await window.$clipboard?.readText()}`);

  // 4. 白名单之外的通道直接被拒
  try {
    await window.$ipc.invoke('not:allowed');
    throw new Error('未声明的通道竟然放行了');
  } catch (error) {
    log(`invoke('not:allowed') 被拒: ${(error as Error).message}`);
  }

  for (const button of document.querySelectorAll<HTMLButtonElement>('[data-window]')) {
    button.addEventListener('click', () => {
      window.$ipc.send(
        EventKeys.WindowOptionsKey,
        button.dataset.window as IpcWindowOptions.SWITCH_MAX,
      );
    });
  }

  if (sum !== 3 || joined !== '/a/c') {
    throw new Error('返回值不符合预期');
  }
}

main().then(
  () => {
    document.body.dataset.smoke = 'ok';
  },
  (error: unknown) => {
    log(String(error));
    document.body.dataset.smoke = `fail: ${String(error)}`;
  },
);
