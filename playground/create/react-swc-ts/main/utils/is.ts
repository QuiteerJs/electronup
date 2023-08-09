import { arch, platform } from 'process'

export class Is {
  static get win() {
    return platform === 'win32'
  }

  static get mac() {
    return platform === 'darwin'
  }

  static get linux() {
    return platform === 'linux'
  }

  static get ia32() {
    return arch === 'ia32'
  }

  static get x64() {
    return arch === 'x64'
  }

  static get dev() {
    return process.env.NODE_ENV === 'development'
  }

  static get prod() {
    return process.env.NODE_ENV === 'production'
  }
}

