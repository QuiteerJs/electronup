import type { MenuItem as MenuItemType, Menu as MenuType } from 'electron';

import type { MenuTemplate, MenuTemplateItem } from './types';

/** 路径分隔符 */
const SEP = '.';

/**
 * 递归补全模板项 id
 *
 * 未指定 id 的项按层级位置生成: 顶级第 0 项 -> '0', 其子第 1 项 -> '0.1'。
 * 指定了 id 的项原样保留, 其子节点以该 id 作为前缀, 因此 'file.save' 这类
 * 点分路径天然成立。
 */
export function normalizeTemplate(template: MenuTemplate, parent = ''): MenuTemplate {
  return template.map((item, index) => {
    const id = item.id ?? (parent === '' ? `${index}` : `${parent}${SEP}${index}`);
    const next: MenuTemplateItem = { ...item, id };

    if (Array.isArray(item.submenu)) {
      next.submenu = normalizeTemplate(item.submenu, id);
    }

    return next;
  });
}

/**
 * 按点分路径在菜单中定位菜单项
 *
 * 'file.save' 表示: 顶级 id 为 'file' 的项, 其 submenu 中 id 为 'file.save' 的项。
 * 每一层用累计路径匹配, 因此支持任意深度。
 */
export function findItem(menu: MenuType, path: string): MenuItemType | undefined {
  const segments = path.split(SEP).filter(Boolean);
  if (segments.length === 0) {
    return undefined;
  }

  let items = menu.items;
  let found: MenuItemType | undefined;

  for (let depth = 0; depth < segments.length; depth++) {
    const id = segments.slice(0, depth + 1).join(SEP);
    found = items.find((item) => item.id === id);
    if (!found) {
      return undefined;
    }
    if (depth < segments.length - 1) {
      items = found.submenu?.items ?? [];
    }
  }

  return found;
}
