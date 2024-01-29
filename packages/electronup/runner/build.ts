import path from 'path'
import { Arch, Platform, build as builder } from 'electron-builder'
import { build as viteBuild } from 'vite'
import { build as tsBuild } from 'tsup'

import prompts from 'prompts'
import { blue, green, red, yellow } from 'kolorist'
import { stringify } from 'yaml'
import { writeFile } from 'fs-extra'
import type { ElectronupConfig } from '../typings/electronup'
import { electronupConfig } from '../transform'
import { DefaultDirs, store } from '../utils'

type ColorFunc = (str: string | number) => string
interface PlatformSelect {
  name: string
  platform: 'win32' | 'darwin' | 'linux'
  disabled: boolean
  createTarget: (archs: Arch[]) => Map<Platform, Map<Arch, Array<string>>>
  color: ColorFunc
  archs?: Framework[]
}

interface Framework {
  name: string
  arch: Arch
  disabled: boolean
  color: ColorFunc
}

const platformSelect: PlatformSelect[] = [
  {
    name: 'Windows',
    platform: 'win32',
    createTarget: (archs: Arch[]) => {
      if (archs.length)
        return Platform.WINDOWS.createTarget(store.dir, ...archs)
      return Platform.WINDOWS.createTarget(store.dir, Arch.ia32, Arch.x64)
    },
    color: blue,
    disabled: !(store.isMac || store.isWin),
    archs: [{
      name: 'x64',
      arch: Arch.x64,
      disabled: store.currentArch === 'ia32',
      color: blue
    }, {
      name: 'ia32',
      arch: Arch.ia32,
      color: blue,
      disabled: false
    }]
  },
  {
    name: 'MacOS',
    platform: 'darwin',
    createTarget: (archs: Arch[]) => {
      if (archs.length)
        return Platform.MAC.createTarget(store.dir, Arch[store.currentArch])
      return Platform.MAC.createTarget(store.dir, ...archs)
    },
    disabled: !store.isMac,
    color: green,
    archs: [{
      name: 'x64',
      arch: Arch.x64,
      disabled: false,
      color: green
    }, {
      name: 'arm64',
      arch: Arch.arm64,
      disabled: false,
      color: green
    }, {
      name: 'universal',
      arch: Arch.universal,
      disabled: false,
      color: green
    }]
  },
  {
    name: 'Linux',
    platform: 'linux',
    disabled: !(store.isMac || store.isLinux),
    createTarget: (archs: Arch[]) => {
      if (archs.length)
        return Platform.LINUX.createTarget(store.dir, Arch[store.currentArch])
      return Platform.LINUX.createTarget(store.dir, ...archs)
    },
    color: yellow,
    archs: [{
      name: 'x64',
      arch: Arch.x64,
      disabled: false,
      color: yellow
    }, {
      name: 'arm64',
      arch: Arch.arm64,
      disabled: false,
      color: yellow
    }, {
      name: 'armv7l',
      arch: Arch.armv7l,
      disabled: false,
      color: yellow
    }]
  }
]

export async function build(options: ElectronupConfig) {
  if (store.option) {
    let result: prompts.Answers<'isMinify' | 'isPackage' | 'platform' | 'arch'>

    try {
      result = await prompts([
        {
          type: 'confirm',
          name: 'isMinify',
          message: green('是否压缩代码?')
        }, {
          type: 'confirm',
          name: 'isPackage',
          message: blue('是否生成安装包?')
        }, {
          type: 'select',
          name: 'platform',
          message: '请选择构建模式 ~',
          choices: platformSelect.map(item => ({ title: item.color(item.name), value: item, disabled: item.disabled }))
        }, {
          type: 'multiselect',
          name: 'arch',
          message: '请选择打包架构～',
          choices: (platformSelect: PlatformSelect) => {
            return platformSelect.archs?.map(item => ({ title: item.color(item.name), value: item.arch, disabled: item.disabled }))
          }
        }
      ], {
        onCancel: () => {
          throw new Error(`${red('✖')} Operation cancelled`)
        }
      })
    }
    catch (cancelled: any) {
      console.error('err: ', cancelled.message)
      process.exit(1)
    }

    const { isMinify, isPackage, platform, arch } = result
    console.log('isMinify: ', isMinify)
    console.log('isPackage: ', isPackage)
    console.log('platform: ', platform)
    console.log('arch: ', arch)

    store.minify = isMinify
    store.dir = isPackage ? null : 'dir'
    store.targets = (platform as PlatformSelect).createTarget(arch as Arch[])
  }
  else {
    if (store.isWin) {
      if (store.win === 'ia32')
        store.targets = Platform.WINDOWS.createTarget(store.dir, Arch.ia32)

      else if (store.win === 'x64')
        store.targets = Platform.WINDOWS.createTarget(store.dir, Arch.x64)

      else
        store.targets = Platform.WINDOWS.createTarget(store.dir, Arch[store.currentArch])
    }

    if (store.isMac) {
      if (store.win) {
        if (store.win === 'ia32')
          store.targets = Platform.WINDOWS.createTarget(store.dir, Arch.ia32)

        else if (store.win === 'x64')
          store.targets = Platform.WINDOWS.createTarget(store.dir, Arch.x64)

        else
          store.targets = Platform.WINDOWS.createTarget(store.dir, Arch[store.currentArch])
      }
      else if (store.mac) {
        if (store.mac === 'x64')
          store.targets = Platform.MAC.createTarget(store.dir, Arch.x64)

        else if (store.mac === 'arm64')
          store.targets = Platform.MAC.createTarget(store.dir, Arch.arm64)

        else if (store.mac === 'universal')
          store.targets = Platform.MAC.createTarget(store.dir, Arch.universal)

        else
          store.targets = Platform.MAC.createTarget(store.dir, Arch[store.currentArch])
      }
      else if (store.linux) {
        if (store.linux === true)
          store.targets = Platform.LINUX.createTarget(store.dir)

        else
          store.targets = Platform.LINUX.createTarget(store.dir, Arch[store.currentArch])
      }

      else {
        store.targets = Platform.MAC.createTarget(store.dir, Arch[store.currentArch])
      }
    }

    else if (store.isLinux) { store.targets = Platform.LINUX.createTarget(store.dir, Arch.armv7l) }
  }

  const initConfig = await electronupConfig(options)

  await viteBuild(initConfig.vite)
  await tsBuild(initConfig.tsup)

  await builder(initConfig.builder)

  await writeFile(
    path.resolve(store.root, options.outDir || DefaultDirs.outDir, 'electronup-effective-config.yaml'),
    stringify(JSON.parse(JSON.stringify(initConfig)))
  )
}
