import type { ElectronupConfig } from '../typings/electronup'
import path from 'node:path'
import process from 'node:process'
import * as prompts from '@clack/prompts'

import { Arch, build as builder, Platform } from 'electron-builder'
import fsExtra from 'fs-extra'
import pc from 'picocolors'
import { build as viteBuild } from 'vite'
import { stringify } from 'yaml'
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
    color: pc.blue,
    disabled: !(store.isMac || store.isWin),
    archs: [{
      name: 'x64',
      arch: Arch.x64,
      disabled: store.currentArch === Arch.ia32,
      color: pc.blue,
    }, {
      name: 'ia32',
      arch: Arch.ia32,
      color: pc.blue,
      disabled: false,
    }],
  },
  {
    name: 'MacOS',
    platform: 'darwin',
    createTarget: (archs: Arch[]) => {
      if (archs.length)
        return Platform.MAC.createTarget(store.dir, store.currentArch)
      return Platform.MAC.createTarget(store.dir, ...archs)
    },
    disabled: !store.isMac,
    color: pc.green,
    archs: [{
      name: 'x64',
      arch: Arch.x64,
      disabled: false,
      color: pc.green,
    }, {
      name: 'arm64',
      arch: Arch.arm64,
      disabled: false,
      color: pc.green,
    }, {
      name: 'universal',
      arch: Arch.universal,
      disabled: false,
      color: pc.green,
    }],
  },
  {
    name: 'Linux',
    platform: 'linux',
    disabled: !(store.isMac || store.isLinux),
    createTarget: (archs: Arch[]) => {
      if (archs.length)
        return Platform.LINUX.createTarget(store.dir, store.currentArch)
      return Platform.LINUX.createTarget(store.dir, ...archs)
    },
    color: pc.yellow,
    archs: [{
      name: 'x64',
      arch: Arch.x64,
      disabled: false,
      color: pc.yellow,
    }, {
      name: 'arm64',
      arch: Arch.arm64,
      disabled: false,
      color: pc.yellow,
    }, {
      name: 'armv7l',
      arch: Arch.armv7l,
      disabled: false,
      color: pc.yellow,
    }],
  },
]

export async function build(options: ElectronupConfig) {
  const { writeFile } = fsExtra
  if (store.option) {
    try {
      const isMinify = await prompts.confirm({
        message: pc.green('是否压缩代码?'),
      })

      if (prompts.isCancel(isMinify)) {
        throw new Error(`${pc.red('✖')} Operation cancelled`)
      }

      const isPackage = await prompts.confirm({
        message: pc.blue('是否生成安装包?'),
      })

      if (prompts.isCancel(isPackage)) {
        throw new Error(`${pc.red('✖')} Operation cancelled`)
      }

      const platform = await prompts.select({
        message: '请选择构建模式 ~',
        options: platformSelect.map(item => ({
          label: item.color(item.name),
          value: item,
          disabled: item.disabled,
        })),
      })

      if (prompts.isCancel(platform)) {
        throw new Error(`${pc.red('✖')} Operation cancelled`)
      }

      const selectedPlatform = platform as PlatformSelect
      const arch = await prompts.multiselect({
        message: '请选择打包架构～',
        options: selectedPlatform.archs?.map(item => ({
          label: item.color(item.name),
          value: item.arch,
          disabled: item.disabled,
        })) || [],
      })

      if (prompts.isCancel(arch)) {
        throw new Error(`${pc.red('✖')} Operation cancelled`)
      }

      store.minify = isMinify
      store.dir = isPackage ? null : 'dir'
      store.targets = selectedPlatform.createTarget(arch as Arch[])
    }
    catch (cancelled: any) {
      console.error('err: ', cancelled.message)
      process.exit(1)
    }
  }
  else {
    if (store.isWin) {
      if (store.win === 'ia32')
        store.targets = Platform.WINDOWS.createTarget(store.dir, Arch.ia32)

      else if (store.win === 'x64')
        store.targets = Platform.WINDOWS.createTarget(store.dir, Arch.x64)

      else
        store.targets = Platform.WINDOWS.createTarget(store.dir, store.currentArch)
    }

    if (store.isMac) {
      if (store.win) {
        if (store.win === 'ia32')
          store.targets = Platform.WINDOWS.createTarget(store.dir, Arch.ia32)

        else if (store.win === 'x64')
          store.targets = Platform.WINDOWS.createTarget(store.dir, Arch.x64)

        else
          store.targets = Platform.WINDOWS.createTarget(store.dir, store.currentArch)
      }
      else if (store.mac) {
        if (store.mac === 'x64')
          store.targets = Platform.MAC.createTarget(store.dir, Arch.x64)

        else if (store.mac === 'arm64')
          store.targets = Platform.MAC.createTarget(store.dir, Arch.arm64)

        else if (store.mac === 'universal')
          store.targets = Platform.MAC.createTarget(store.dir, Arch.universal)

        else
          store.targets = Platform.MAC.createTarget(store.dir, store.currentArch)
      }
      else if (store.linux) {
        if (store.linux === true)
          store.targets = Platform.LINUX.createTarget(store.dir)

        else
          store.targets = Platform.LINUX.createTarget(store.dir, store.currentArch)
      }

      else {
        store.targets = Platform.MAC.createTarget(store.dir, store.currentArch)
      }
    }

    else if (store.isLinux) {
      store.targets = Platform.LINUX.createTarget(store.dir, Arch.armv7l)
    }
  }

  const initConfig = await electronupConfig(options)

  await viteBuild(initConfig.vite)
  const { build: tsBuild } = await import('tsdown')
  await tsBuild(initConfig.tsdown)

  await builder(initConfig.builder)

  await writeFile(
    path.resolve(store.root, options.outDir || DefaultDirs.outDir, 'electronup-effective-config.yaml'),
    stringify(JSON.parse(JSON.stringify(initConfig))),
  )
}
