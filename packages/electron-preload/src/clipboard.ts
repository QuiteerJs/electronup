import { clipboard } from 'electron'

export interface PreloadClipboard {
  /** 清空剪贴板, type 仅 Linux 生效, 默认 'clipboard' */
  clear(type?: 'clipboard' | 'selection'): void
  has(mimetype: string): Promise<boolean>
  read(): Promise<Electron.ClipboardItem[]>
  readText(): Promise<string>
  write(data: Electron.ClipboardItem[]): Promise<void>
  writeText(text: string): Promise<void>
}

export const $clipboard: PreloadClipboard = {
  clear: () => clipboard.clear(),
  has: (...args) => clipboard.has(...args),
  read: () => clipboard.read(),
  readText: () => clipboard.readText(),
  write: (...args) => clipboard.write(...args),
  writeText: (...args) => clipboard.writeText(...args)
}
