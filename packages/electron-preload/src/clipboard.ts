import { clipboard } from 'electron'

export interface PreloadClipboard {
  clear(): void
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
