import assert from 'node:assert/strict';
import { test } from 'node:test';

import { Menu, Tray, nativeImage } from 'electron';
import type { NativeImage } from 'electron';

import {
  TrayStore,
  createTrayManager,
  createTrayState,
  resolveIcon,
  toController,
  trays,
} from '../src/index';

/** 取托盘当前图标的文件名, 便于断言 */
function iconOf(tray: Tray): string {
  return (tray.image as NativeImage).source;
}

test('创建托盘并按名取到同一实例', () => {
  Tray.reset();
  const main = trays.create({ name: 'main', icon: 'icons/tray.png', tooltip: 'demo' });

  assert.equal(trays.get('main'), main.target);
  assert.ok(trays.has('main'));
  assert.equal(trays.size, 1);
  assert.equal(main.tooltip, 'demo');
  assert.equal(main.target.tooltip, 'demo');
});

test('图标状态切换同步到托盘', () => {
  Tray.reset();
  const tray = trays.create({
    name: 'sync',
    icon: { idle: 'icons/idle.png', syncing: 'icons/syncing.png' },
    tooltip: 'sync',
  });

  // 未指定 initialState 时取第一个 key
  assert.equal(tray.state, 'idle');
  assert.equal(tray.icon, 'icons/idle.png');
  assert.equal(iconOf(tray.target), 'icons/idle.png');

  tray.state = 'syncing';
  assert.equal(tray.state, 'syncing');
  assert.equal(tray.icon, 'icons/syncing.png');
  assert.equal(iconOf(tray.target), 'icons/syncing.png');

  assert.throws(() => {
    tray.state = 'nope' as 'idle';
  }, /未定义状态 "nope" 的图标/);
});

test('initialState 指定初始状态', () => {
  const tray = trays.create({
    name: 'init',
    icon: { idle: 'icons/idle.png', syncing: 'icons/syncing.png' },
    initialState: 'syncing',
  });
  assert.equal(tray.state, 'syncing');
  assert.equal(iconOf(tray.target), 'icons/syncing.png');
});

test('title 读写与 tooltip 写入同步', () => {
  const tray = trays.getController('main')!;

  tray.title = '标题';
  assert.equal(tray.title, '标题');
  assert.equal(tray.target.title, '标题');

  tray.tooltip = '新提示';
  assert.equal(tray.tooltip, '新提示');
  assert.equal(tray.target.tooltip, '新提示');
});

test('右键菜单模板构建与刷新', () => {
  Tray.reset();
  let count = 0;
  const tray = trays.create({
    name: 'menu',
    icon: 'icons/tray.png',
    contextMenu: () => {
      count++;
      return [{ label: `第 ${count} 次` }];
    },
  });

  assert.equal(count, 1);
  assert.equal(Menu.templates.length, 1);
  assert.equal(tray.target.menu, tray.menu);

  tray.refreshMenu();
  assert.equal(count, 2);
  assert.equal(Menu.templates.length, 2);
  assert.equal((tray.menu as Menu).items[0].label, '第 2 次');
});

test('菜单支持数组模板 / Menu 实例 / 清空', () => {
  const tray = trays.getController('menu')!;

  const menu = new Menu([{ label: '直接给实例' }]);
  tray.menu = menu;
  assert.equal(tray.target.menu, menu);
  assert.equal(tray.menu, menu);

  tray.menu = [{ label: '数组模板' }];
  assert.notEqual(tray.menu, menu);
  assert.equal((tray.menu as Menu).items[0].label, '数组模板');

  tray.menu = null;
  assert.equal(tray.target.menu, null);
  assert.equal(tray.menu, undefined);
});

test('点击类事件回调携带上下文', () => {
  Tray.reset();
  const clicks: string[] = [];
  const tray = createTrayManager<'main', 'idle'>().create({
    name: 'main',
    icon: { idle: 'icons/idle.png' },
    ignoreDoubleClick: true,
    onClick: (ctx) => clicks.push(`click:${ctx.name}`),
    onDoubleClick: (ctx) => clicks.push(`double:${ctx.name}`),
    onRightClick: (ctx) => clicks.push(`right:${ctx.name}`),
    onBalloonShow: (ctx) => clicks.push(`balloon:${ctx.state}`),
  });

  tray.target.emit('click', {}, {}, {});
  tray.target.emit('double-click', {}, {});
  tray.target.emit('right-click', {}, {}, {});
  tray.target.emit('balloon-show');

  assert.deepEqual(clicks, ['click:main', 'double:main', 'right:main', 'balloon:idle']);
  assert.equal(tray.target.getIgnoreDoubleClickEvents(), true);
});

test('popupOnClick 在点击时手动弹出菜单', () => {
  Tray.reset();
  const tray = trays.create({
    name: 'popup',
    icon: 'icons/tray.png',
    contextMenu: [{ label: 'a' }],
    popupOnClick: true,
  });

  tray.target.emit('click', {}, {}, {});
  assert.equal(tray.target.popups, 1);
});

test('同名冲突策略 reuse / error / recreate', () => {
  Tray.reset();
  const manager = createTrayManager<'conflict'>();
  const first = manager.create({ name: 'conflict', icon: 'icons/a.png' });
  const again = manager.create({ name: 'conflict', icon: 'icons/b.png' });

  // reuse: 复用已有托盘, 不新建实例
  assert.equal(again, first);
  assert.equal(Tray.instances.length, 1);
  assert.equal(manager.size, 1);

  assert.throws(
    () => manager.create({ name: 'conflict', icon: 'icons/c.png', conflict: 'error' }),
    /托盘 "conflict" 已存在/,
  );
  assert.equal(Tray.instances.length, 1);

  // recreate: 销毁旧托盘后重建
  const recreated = manager.create({ name: 'conflict', icon: 'icons/c.png', conflict: 'recreate' });
  assert.notEqual(recreated, first);
  assert.equal(first.target.isDestroyed(), true);
  assert.equal(Tray.instances.length, 2);
  assert.equal(manager.size, 1);
  assert.equal(iconOf(manager.get('conflict')!), 'icons/c.png');
});

test('外部创建的托盘可纳入管理', () => {
  Tray.reset();
  const raw = new Tray('icons/ext.png');
  const controller = trays.register('ext', raw);
  assert.equal(trays.get('ext'), raw);
  assert.equal(controller.name, 'ext');

  // 同名覆盖注册后, 旧托盘销毁不应摘除新映射
  const raw2 = new Tray('icons/ext2.png');
  trays.register('ext', raw2);
  raw.destroy();
  assert.equal(trays.get('ext'), raw2);
});

test('销毁后自动从仓库摘除', () => {
  const controller = trays.getController('ext')!;
  controller.destroy();
  assert.equal(controller.target.isDestroyed(), true);
  assert.equal(trays.has('ext'), false);
  assert.equal(trays.get('ext'), undefined);

  assert.equal(trays.destroy('ext'), false);
});

test('气泡通知仅在 win32 生效', () => {
  Tray.reset();
  const tray = trays.create({ name: 'balloon', icon: 'icons/tray.png' });
  const shown = tray.balloon({ title: '标题', content: '内容' });

  if (process.platform === 'win32') {
    assert.equal(shown, true);
    assert.equal(Tray.balloons.length, 1);
  } else {
    assert.equal(shown, false);
    assert.equal(Tray.balloons.length, 0);
  }

  assert.equal(trays.balloon('nope', { title: 'x', content: 'y' }), false);
});

test('缺失托盘 getOrThrow 抛错', () => {
  assert.throws(() => trays.getOrThrow('nope'), /托盘 "nope" 不存在或已销毁/);
});

test('manager 便捷方法作用于目标托盘', () => {
  Tray.reset();
  const manager = createTrayManager<'app', 'idle' | 'busy'>();
  manager.create({
    name: 'app',
    icon: { idle: 'icons/idle.png', busy: 'icons/busy.png' },
    contextMenu: [{ label: 'app' }],
  });

  assert.equal(manager.setState('app', 'busy'), true);
  assert.equal(iconOf(manager.get('app')!), 'icons/busy.png');

  assert.equal(manager.setIcon('app', 'icons/custom.png'), true);
  assert.equal(iconOf(manager.get('app')!), 'icons/custom.png');

  assert.equal(manager.setTooltip('app', '忙碌'), true);
  assert.equal(manager.get('app')!.tooltip, '忙碌');

  assert.equal(manager.refreshMenu('app'), true);
  assert.equal(Menu.templates.length, 2);

  assert.equal(manager.setMenu('app', [{ label: 'new' }]), true);
  assert.equal((manager.getController('app')!.menu as Menu).items[0].label, 'new');

  // @ts-expect-error 运行时传入未注册的名称
  assert.equal(manager.setState('nope', 'idle'), false);
  assert.deepEqual(manager.names(), ['app']);
});

test('多个 manager 实例互相隔离', () => {
  const a = createTrayManager();
  const b = createTrayManager();
  a.create({ name: 'a', icon: 'icons/a.png' });
  b.create({ name: 'b', icon: 'icons/b.png' });

  assert.equal(a.size, 1);
  assert.equal(b.size, 1);
  assert.equal(a.has('b'), false);
  assert.equal(b.has('a'), false);
});

test('图标来源归一化: 路径 / data URL / 模板图', () => {
  const fromPath = resolveIcon('icons/a.png') as NativeImage;
  assert.equal(fromPath.kind, 'path');
  assert.equal(fromPath.source, 'icons/a.png');

  const fromData = resolveIcon('data:image/png;base64,xxx') as NativeImage;
  assert.equal(fromData.kind, 'dataURL');

  const template = resolveIcon('icons/a.png', { template: true }) as NativeImage;
  assert.equal(template.isTemplateImage(), true);

  const sized = resolveIcon(nativeImage.createFromPath('icons/a.png'), {
    size: { width: 32, height: 32 },
  }) as NativeImage;
  assert.equal(sized.source, 'icons/a.png');
});

test('TrayStore 可独立使用, destroyAll 销毁并清空', () => {
  Tray.reset();
  const store = new TrayStore();
  const raw = new Tray('icons/a.png');
  store.register('raw', toController(raw, createTrayState<string, string>('raw')));

  assert.equal(store.list().length, 1);
  assert.deepEqual(store.names(), ['raw']);
  assert.equal(store.find((controller) => controller.name === 'raw')?.target, raw);

  store.destroyAll();
  assert.equal(raw.isDestroyed(), true);
  assert.equal(store.size, 0);
});

test('clear 仅摘除注册不销毁托盘', () => {
  Tray.reset();
  const store = new TrayStore();
  const raw = new Tray('icons/a.png');
  store.register('raw', toController(raw, createTrayState<string, string>('raw')));

  store.clear();
  assert.equal(store.size, 0);
  assert.equal(raw.isDestroyed(), false);
});
