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
  win?: true | 'ia32' | 'x64'
  mac?: true | 'x64' | 'arm64' | 'universal'
  linux?: true | 'x64' | 'arm64' | 'armv7l'
  dir?: 'dir' | null
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
