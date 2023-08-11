import type { Clipboard } from 'electron'
import { clipboard } from 'electron'

type ClipboardParameters<K extends keyof Clipboard> = Parameters<Clipboard[K]>
type ClipboardReturnType<K extends keyof Clipboard> = ReturnType<Clipboard[K]>

export interface PreloadClipboard {
  readText(...args: ClipboardParameters<'readText'>): ClipboardReturnType<'readText'>
  writeText(...args: ClipboardParameters<'writeText'>): ClipboardReturnType<'writeText'>
  readHTML(...args: ClipboardParameters<'readHTML'>): ClipboardReturnType<'readHTML'>
  writeHTML(...args: ClipboardParameters<'writeHTML'>): ClipboardReturnType<'writeHTML'>
  readImage(...args: ClipboardParameters<'readImage'>): ClipboardReturnType<'readImage'>
  writeImage(...args: ClipboardParameters<'writeImage'>): ClipboardReturnType<'writeImage'>
  readRTF(...args: ClipboardParameters<'readRTF'>): ClipboardReturnType<'readRTF'>
  writeRTF(...args: ClipboardParameters<'writeRTF'>): ClipboardReturnType<'writeRTF'>
  readBookmark(...args: ClipboardParameters<'readBookmark'>): ClipboardReturnType<'readBookmark'>
  writeBookmark(...args: ClipboardParameters<'writeBookmark'>): ClipboardReturnType<'writeBookmark'>
  readFindText(...args: ClipboardParameters<'readFindText'>): ClipboardReturnType<'readFindText'>
  writeFindText(...args: ClipboardParameters<'writeFindText'>): ClipboardReturnType<'writeFindText'>
  clear(...args: ClipboardParameters<'clear'>): ClipboardReturnType<'clear'>
  availableFormats(...args: ClipboardParameters<'availableFormats'>): ClipboardReturnType<'availableFormats'>
  has(...args: ClipboardParameters<'has'>): ClipboardReturnType<'has'>
  read(...args: ClipboardParameters<'read'>): ClipboardReturnType<'read'>
  readBuffer(...args: ClipboardParameters<'readBuffer'>): ClipboardReturnType<'readBuffer'>
  writeBuffer(...args: ClipboardParameters<'writeBuffer'>): ClipboardReturnType<'writeBuffer'>
  write(...args: ClipboardParameters<'write'>): ClipboardReturnType<'write'>
}

export const $clipboard: PreloadClipboard = {
  readText: (...args) => clipboard.readText(...args),
  writeText: (...args) => clipboard.writeText(...args),
  readHTML: (...args) => clipboard.readHTML(...args),
  writeHTML: (...args) => clipboard.writeHTML(...args),
  readImage: (...args) => clipboard.readImage(...args),
  writeImage: (...args) => clipboard.writeImage(...args),
  readRTF: (...args) => clipboard.readRTF(...args),
  writeRTF: (...args) => clipboard.writeRTF(...args),
  readBookmark: (...args) => clipboard.readBookmark(...args),
  writeBookmark: (...args) => clipboard.writeBookmark(...args),
  readFindText: (...args) => clipboard.readFindText(...args),
  writeFindText: (...args) => clipboard.writeFindText(...args),
  clear: (...args) => clipboard.clear(...args),
  availableFormats: (...args) => clipboard.availableFormats(...args),
  has: (...args) => clipboard.has(...args),
  read: (...args) => clipboard.read(...args),
  readBuffer: (...args) => clipboard.readBuffer(...args),
  writeBuffer: (...args) => clipboard.writeBuffer(...args),
  write: (...args) => clipboard.write(...args)
}
