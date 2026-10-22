import type { Platform } from 'electron-builder'
import type { ResolveTargetsOptions } from '../runner/targets'
import process from 'node:process'
import { Arch } from 'electron-builder'

type Command = 'build' | 'serve'
/** 常用环境模式 , 其余自定义模式同为合法值 */
type Mode = 'development' | 'production' | 'test' | 'staging' | (string & {})

class Store {
  static instance: Store

  command!: Command
  config!: string
  mode!: Mode
  minify!: boolean
  port?: number
  option!: boolean
  win?: ResolveTargetsOptions['win']
  mac?: ResolveTargetsOptions['mac']
  linux?: ResolveTargetsOptions['linux']
  dir?: 'dir' | null
  asar?: boolean
  /** 只构建渲染进程 ( web ) , 跳过主进程 / preload 与 electron-builder */
  web?: boolean
  targets?: Map<Platform, Map<Arch, string[]>>

  static getInstance() {
    if (this.instance)
      {return this.instance}
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

  get currentArch(): Arch {
    switch (process.arch) {
      case 'ia32':
        return Arch.ia32
      case 'x64':
        return Arch.x64
      case 'arm64':
        return Arch.arm64
      case 'arm':
        return Arch.armv7l
      default:
        return Arch.x64
    }
  }
}
export const store = Store.getInstance()
