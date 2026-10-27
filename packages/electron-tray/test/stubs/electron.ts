/**
 * 测试替身: 最小可用的 Tray / Menu / nativeImage 实现
 * 仅在 test 打包时通过 alias 替换 electron, 不参与产物构建
 */

export interface Size {
  width: number;
  height: number;
}

/** 以下只作类型使用, 对应 electron 的同名类型 */
export interface Point {
  x: number;
  y: number;
}

export interface Rectangle extends Point, Size {}

export interface Event {
  preventDefault: () => void;
}

export interface KeyboardEvent {
  altKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
}

export interface DisplayBalloonOptions {
  title: string;
  content: string;
  icon?: NativeImage | string;
  iconType?: 'none' | 'info' | 'warning' | 'error' | 'custom';
  largeIcon?: boolean;
  noSound?: boolean;
  respectQuietTime?: boolean;
}

export interface TitleOptions {
  fontType?: 'monospaced' | 'monospacedDigit';
}

export class NativeImage {
  kind: 'path' | 'dataURL';
  source: string;
  template = false;

  constructor(kind: 'path' | 'dataURL', source: string) {
    this.kind = kind;
    this.source = source;
  }

  getSize(scaleFactor = 1): Size {
    return { width: 16 * scaleFactor, height: 16 * scaleFactor };
  }

  isEmpty(): boolean {
    return this.source.length === 0;
  }

  isTemplateImage(): boolean {
    return this.template;
  }

  setTemplateImage(option: boolean): void {
    this.template = option;
  }

  resize(_options?: { width?: number; height?: number }): NativeImage {
    return new NativeImage(this.kind, this.source);
  }

  toDataURL(): string {
    return `data:${this.kind}:${this.source}`;
  }
}

export const nativeImage = {
  createFromPath(path: string): NativeImage {
    return new NativeImage('path', path);
  },
  createFromDataURL(url: string): NativeImage {
    return new NativeImage('dataURL', url);
  },
  createEmpty(): NativeImage {
    return new NativeImage('path', '');
  },
};

export type MenuItemConstructorOptions = Record<string, any>;

export class Menu {
  static templates: MenuItemConstructorOptions[][] = [];
  static popups = 0;

  items: MenuItemConstructorOptions[];

  constructor(items: MenuItemConstructorOptions[] = []) {
    this.items = items;
  }

  static reset(): void {
    Menu.templates = [];
    Menu.popups = 0;
  }

  static buildFromTemplate(template: MenuItemConstructorOptions[]): Menu {
    Menu.templates.push(template);
    return new Menu(template);
  }

  popup(): void {
    Menu.popups++;
  }

  closePopup(): void {}

  append(): void {}

  getMenuItemById(): null {
    return null;
  }
}

class Emitter {
  private _listeners: Record<string, ((...args: any[]) => void)[]> = {};

  on(event: string, listener: (...args: any[]) => void): this {
    (this._listeners[event] ||= []).push(listener);
    return this;
  }

  once(event: string, listener: (...args: any[]) => void): this {
    return this.on(event, listener);
  }

  off(): this {
    return this;
  }

  emit(event: string, ...args: unknown[]): void {
    // 先拷贝, 回调里可能会移除自身 (once)
    for (const listener of (this._listeners[event] ?? []).slice()) {
      listener(...args);
    }
  }
}

export class Tray extends Emitter {
  static instances: Tray[] = [];
  static balloons: unknown[] = [];

  image: NativeImage | string;
  guid: string | undefined;
  tooltip: string | undefined;
  title = '';
  titleOptions: unknown;
  menu: Menu | null = null;
  pressedImage: NativeImage | string | undefined;
  ignoreDoubleClick = false;
  bounds = { x: 0, y: 0, width: 16, height: 16 };
  popups = 0;

  private _destroyed = false;

  constructor(image: NativeImage | string, guid?: string) {
    super();
    this.image = image;
    this.guid = guid;
    Tray.instances.push(this);
  }

  static reset(): void {
    Tray.instances = [];
    Tray.balloons = [];
    Menu.reset();
  }

  setImage(image: NativeImage | string): void {
    this.image = image;
  }

  setPressedImage(image: NativeImage | string): void {
    this.pressedImage = image;
  }

  setToolTip(toolTip: string): void {
    this.tooltip = toolTip;
  }

  setTitle(title: string, options?: TitleOptions): void {
    this.title = title;
    this.titleOptions = options;
  }

  getTitle(): string {
    return this.title;
  }

  setContextMenu(menu: Menu | null): void {
    this.menu = menu;
  }

  getBounds(): typeof this.bounds {
    return { ...this.bounds };
  }

  setIgnoreDoubleClickEvents(ignore: boolean): void {
    this.ignoreDoubleClick = ignore;
  }

  getIgnoreDoubleClickEvents(): boolean {
    return this.ignoreDoubleClick;
  }

  displayBalloon(options: DisplayBalloonOptions): void {
    Tray.balloons.push(options);
  }

  removeBalloon(): void {}

  focus(): void {}

  popUpContextMenu(_menu?: Menu): void {
    this.popups++;
    Menu.popups++;
  }

  closeContextMenu(): void {}

  getGUID(): string | null {
    return this.guid ?? null;
  }

  isDestroyed(): boolean {
    return this._destroyed;
  }

  destroy(): void {
    this._destroyed = true;
  }
}
