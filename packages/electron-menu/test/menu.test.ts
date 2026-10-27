import assert from 'node:assert/strict';
import { test } from 'node:test';

import { Menu, app } from 'electron';

import { createMenuManager, menus } from '../src/index';
import type { MenuTemplate } from '../src/types';

/** 每次返回新数组, 避免用例间共享状态 */
const template = (): MenuTemplate => [
  {
    id: 'file',
    label: '文件',
    submenu: [
      { id: 'file.new', label: '新建', accelerator: 'CmdOrCtrl+N' },
      { type: 'separator' },
      { id: 'file.save', label: '保存', accelerator: 'CmdOrCtrl+S', click: () => {} },
    ],
  },
  {
    id: 'edit',
    label: '编辑',
    submenu: [{ id: 'edit.undo', label: '撤销' }],
  },
];

/** 临时切换 process.platform 以验证平台差异逻辑 */
function withPlatform(platform: string, fn: () => void): void {
  const original = process.platform;
  Object.defineProperty(process, 'platform', { value: platform, configurable: true });
  try {
    fn();
  } finally {
    Object.defineProperty(process, 'platform', { value: original, configurable: true });
  }
}

test('创建应用菜单自动 setApplicationMenu', () => {
  Menu.reset();
  const manager = createMenuManager();
  const controller = manager.create({ name: 'app', template: template() });

  assert.equal(Menu.getApplicationMenu(), controller.target);
  assert.equal(Menu.applyCount, 1);
});

test('点分路径定位任意层级菜单项', () => {
  Menu.reset();
  const manager = createMenuManager();
  manager.create({ name: 'app', kind: 'context', template: template() });

  const item = manager.item('app', 'file.save')!;
  assert.ok(item);
  assert.equal(item.label, '保存');
  assert.equal(item.accelerator, 'CmdOrCtrl+S');
  assert.equal(item.path, 'file.save');
  assert.equal(item.target.id, 'file.save');
});

test('update 批量更新菜单项', () => {
  Menu.reset();
  const manager = createMenuManager();
  manager.create({ name: 'app', kind: 'context', template: template() });

  assert.equal(manager.update('app', 'file.save', { enabled: false, label: '保存中' }), true);
  const item = manager.item('app', 'file.save')!;
  assert.equal(item.enabled, false);
  assert.equal(item.label, '保存中');

  assert.equal(manager.update('app', 'not.exist', { label: 'x' }), false);
});

test('句柄写入属性直接作用到原生菜单项', () => {
  Menu.reset();
  const manager = createMenuManager();
  manager.create({ name: 'app', kind: 'context', template: template() });

  const item = manager.item('app', 'file.save')!;
  item.checked = true;
  assert.equal(item.target.checked, true);
  item.visible = false;
  assert.equal(item.target.visible, false);
  assert.equal(manager.item('app', 'file.save')!.visible, false);
});

test('未指定 id 的项按层级位置自动生成', () => {
  Menu.reset();
  const manager = createMenuManager();
  manager.create({
    name: 'app',
    kind: 'context',
    template: [
      {
        label: '文件',
        submenu: [{ label: '新建' }, { label: '保存' }],
      },
    ],
  });

  assert.equal(manager.item('app', '0')?.label, '文件');
  assert.equal(manager.item('app', '0.0')?.label, '新建');
  assert.equal(manager.item('app', '0.1')?.label, '保存');
});

test('refresh 按模板重建, 函数模板重新求值', () => {
  Menu.reset();
  const manager = createMenuManager();
  let paused = false;

  manager.create({
    name: 'app',
    kind: 'context',
    template: () => [{ id: 'toggle', label: paused ? '继续' : '暂停' }],
  });

  assert.equal(manager.item('app', 'toggle')?.label, '暂停');
  const before = manager.get('app');

  paused = true;
  manager.refresh('app');

  assert.equal(manager.item('app', 'toggle')?.label, '继续');
  assert.notEqual(manager.get('app'), before);
});

test('上下文菜单需手动 popup, 不会占用应用菜单', () => {
  Menu.reset();
  const manager = createMenuManager();
  const controller = manager.create({ name: 'editor', kind: 'context', template: template() });

  assert.equal(Menu.applyCount, 0);
  assert.notEqual(Menu.getApplicationMenu(), controller.target);

  assert.equal(manager.popup('editor', { x: 10, y: 20 }), true);
  assert.deepEqual(controller.target.popped, [{ x: 10, y: 20 }]);
  assert.equal(manager.popup('not-exist'), false);
});

test('dock 菜单走 app.dock.setMenu', () => {
  Menu.reset();
  const manager = createMenuManager();
  const controller = manager.create({ name: 'dock', kind: 'dock', template: template() });

  assert.equal(app.dock.menu, controller.target);
  assert.equal(Menu.applyCount, 0);
});

test('同名冲突策略 reuse / error / recreate', () => {
  Menu.reset();
  const manager = createMenuManager();

  const first = manager.create({
    name: 'app',
    kind: 'context',
    template: [{ id: 'a', label: 'A' }],
  });
  const again = manager.create({
    name: 'app',
    kind: 'context',
    template: [{ id: 'b', label: 'B' }],
  });
  assert.equal(again, first);
  assert.equal(manager.item('app', 'a')?.label, 'A');

  assert.throws(
    () => manager.create({ name: 'app', kind: 'context', conflict: 'error', template: [] }),
    /菜单 "app" 已存在/,
  );

  const recreated = manager.create({
    name: 'app',
    kind: 'context',
    conflict: 'recreate',
    template: [{ id: 'c', label: 'C' }],
  });
  assert.notEqual(recreated, first);
  assert.equal(manager.item('app', 'c')?.label, 'C');
  assert.equal(manager.item('app', 'a'), undefined);
});

test('items() 返回顶级菜单项, get(id) 支持任意层级', () => {
  Menu.reset();
  const manager = createMenuManager();
  manager.create({ name: 'app', kind: 'context', template: template() });

  const controller = manager.getController('app')!;
  assert.deepEqual(
    controller.items().map((item) => item.id),
    ['file', 'edit'],
  );
  assert.equal(controller.get('edit.undo')?.label, '撤销');
});

test('摘除注册与清空', () => {
  Menu.reset();
  const manager = createMenuManager();
  manager.create({ name: 'a', kind: 'context', template: [] });
  manager.create({ name: 'b', kind: 'context', template: [] });

  assert.equal(manager.size, 2);
  assert.equal(manager.destroy('a'), true);
  assert.equal(manager.has('a'), false);
  assert.equal(manager.size, 1);

  manager.destroyAll();
  assert.equal(manager.size, 0);
});

test('外部菜单可纳入管理', () => {
  Menu.reset();
  const manager = createMenuManager();
  const external = Menu.buildFromTemplate([{ id: 'ext', label: '外部项' }]);

  const controller = manager.register('external', external, 'context');
  assert.equal(controller.target, external);
  assert.equal(manager.item('external', 'ext')?.label, '外部项');
  assert.equal(manager.getOrThrow('external'), external);
  assert.throws(() => manager.getOrThrow('missing'), /菜单 "missing" 不存在/);
});

test('多个 manager 实例互相隔离', () => {
  Menu.reset();
  const first = createMenuManager();
  const second = createMenuManager();

  first.create({ name: 'x', kind: 'context', template: [] });
  assert.equal(first.size, 1);
  assert.equal(second.size, 0);
  assert.equal(second.get('x'), undefined);
});

test('平台差异: win/linux 改动后重新应用, mac 不需要', () => {
  withPlatform('win32', () => {
    Menu.reset();
    const manager = createMenuManager();
    manager.create({ name: 'app', template: template() });
    assert.equal(Menu.applyCount, 1);

    manager.update('app', 'file.save', { enabled: false });
    assert.equal(Menu.applyCount, 2);

    manager.item('app', 'file.save')!.checked = true;
    assert.equal(Menu.applyCount, 3);
  });

  withPlatform('darwin', () => {
    Menu.reset();
    const manager = createMenuManager();
    manager.create({ name: 'app', template: template() });
    assert.equal(Menu.applyCount, 1);

    manager.update('app', 'file.save', { enabled: false });
    assert.equal(Menu.applyCount, 1);
  });
});

test('全局 menus 单例可用', () => {
  Menu.reset();
  menus.create({
    name: 'global',
    kind: 'context',
    template: [{ id: 'x', label: 'X' }],
  });

  assert.equal(menus.item('global', 'x')?.label, 'X');
  assert.equal(menus.has('global'), true);

  menus.destroy('global');
  assert.equal(menus.has('global'), false);
});
