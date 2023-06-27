import type { Arch, Platform } from 'electron-builder'

type Command = 'build' | 'serve'
type Mode = 'development' | 'production' | 'test' | 'staging' | string

class Store {
  static instance: Store

  command: Command
  config: string
  mode: Mode
  minify: boolean
  port?: number
  option: boolean
  win?: boolean
  mac?: boolean
  linux?: boolean
  ia32?: boolean
  x64?: boolean
  arm64?: boolean
  armv7l?: boolean
  universal?: boolean
  dir?: boolean
  asar?: boolean
  targets?: Map<Platform, Map<Arch, string[]>>

  static getInstance() {
    if (this.instance)
      return this.instance
    return (this.instance = new Store())
  }

  get root() {
    return process.cwd()
  }

  get isWin() {
    return process.platform === 'win32'
  }

  get isMac() {
    return process.platform === 'darwin'
  }

  get isLinux() {
    return process.platform === 'linux'
  }

  get currentArch() {
    return process.arch
  }
}

export const store = Store.getInstance()
