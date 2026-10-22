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
import { cleanOutputDirsOrExit } from './clean'
import { resolveBuildTargets } from './targets'

type ColorFunc = (str: string | number) => string
interface PlatformSelect {
  name: string
  platform: 'win32' | 'darwin' | 'linux'
  disabled: boolean
  /** 平台不可用时的原因提示 */
  disabledHint?: string
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
        {return Platform.WINDOWS.createTarget(store.dir, ...archs)}
      return Platform.WINDOWS.createTarget(store.dir, Arch.ia32, Arch.x64)
    },
    color: pc.blue,
    disabled: !(store.isMac || store.isWin),
    disabledHint: '仅支持在 macOS / Windows 上构建',
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
        {return Platform.MAC.createTarget(store.dir, ...archs)}
      return Platform.MAC.createTarget(store.dir, store.currentArch)
    },
    disabled: !store.isMac,
    disabledHint: '仅支持在 macOS 上构建',
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
    disabledHint: '仅支持在 macOS / Linux 上构建',
    createTarget: (archs: Arch[]) => {
      if (archs.length)
        {return Platform.LINUX.createTarget(store.dir, ...archs)}
      return Platform.LINUX.createTarget(store.dir, store.currentArch)
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

/**
 * @param options 已执行 / 校验过的配置对象 ( 见 resolveElectronupConfig ) ,
 * 函数式导出必须先执行 , 否则读不到 resourceDir / outDir
 */
export async function build(options: ElectronupConfig) {
  const { writeFile } = fsExtra

  // 清理必须在目标解析 / 交互式向导之后 : 平台不支持、参数错误或用户取消时 , 上一次的产物保持不变
  // --web 只构建渲染进程 , 不涉及打包平台与架构 , 跳过目标解析与交互式向导
  if (!store.web) {
    if (store.option)
      {await resolveInteractiveOptions()}
    else {
      try {
        store.targets = resolveBuildTargets({
          win: store.win,
          mac: store.mac,
          linux: store.linux,
          dir: store.dir,
        })
      }
      catch (error: any) {
        console.error('err: ', error.message)
        process.exit(1)
      }
    }
  }

  // --web 不产出安装包 , 只清空 resourceDir , 保留 outDir
  const cleanTargets = [options.resourceDir || DefaultDirs.resourceDir]
  if (!store.web) { cleanTargets.push(options.outDir || DefaultDirs.outDir) }
  cleanOutputDirsOrExit(cleanTargets)

  const initConfig = await electronupConfig(options)

  await viteBuild(initConfig.vite)

  // --web 到此为止 : 不构建 preload / 主进程 , 也不执行 electron-builder
  if (store.web)
    {return}

  const { build: packBuild } = await import('vite-plus/pack')
  for (const preloadConfig of initConfig.preload)
    {await packBuild(preloadConfig)}
  await packBuild(initConfig.pack)

  await builder(initConfig.builder)

  const outDir = path.resolve(store.root, options.outDir || DefaultDirs.outDir)
  await writeFile(
    path.resolve(outDir, 'electronup-effective-config.yaml'),
    stringify(JSON.parse(JSON.stringify(initConfig))),
  )

  if (store.option)
    {prompts.outro(`${pc.green('构建完成')} ${pc.dim('产物目录：')} ${pc.cyan(outDir)}`)}
}

/** 取消交互式流程：给出友好提示后退出 */
function ensure<T>(result: T | typeof prompts.CANCEL_SYMBOL): T {
  if (prompts.isCancel(result)) {
    prompts.cancel('已取消构建')
    process.exit(0)
  }
  return result
}

/** 交互式打包向导：依次收集构建选项并写入 store */
async function resolveInteractiveOptions() {
  prompts.intro(`${pc.bgCyan(pc.black(' electronup '))} 交互式打包向导`)

  const available = platformSelect
    .filter(item => !item.disabled)
    .map(item => item.color(item.name))
    .join(pc.dim(' / '))

  prompts.note(
    [
      '接下来将依次确认以下选项，直接回车即采用默认值：',
      `${pc.dim('·')} 是否压缩代码`,
      `${pc.dim('·')} 是否生成安装包`,
      `${pc.dim('·')} 构建平台`,
      `${pc.dim('·')} 打包架构`,
      '',
      `当前系统可构建的平台：${available}`,
    ].join('\n'),
    '打包向导',
  )

  const minify = ensure(await prompts.confirm({
    message: '是否压缩代码？',
    initialValue: store.minify,
  }))

  const isPackage = ensure(await prompts.confirm({
    message: '是否生成安装包？',
    initialValue: store.dir !== 'dir',
  }))

  const currentPlatformName = store.isWin ? 'win32' : store.isMac ? 'darwin' : 'linux'

  const platform = ensure(await prompts.select<PlatformSelect>({
    message: '请选择要构建的平台',
    initialValue: platformSelect.find(item => item.platform === currentPlatformName && !item.disabled)
      ?? platformSelect.find(item => !item.disabled),
    options: platformSelect.map(item => ({
      label: item.color(item.name),
      value: item,
      disabled: item.disabled,
      hint: item.disabled
        ? item.disabledHint
        : item.platform === currentPlatformName ? '当前系统' : undefined,
    })),
  }))

  const archs = ensure(await prompts.multiselect<Arch>({
    message: `请选择 ${platform.name} 的打包架构（空格选择，回车确认）`,
    required: true,
    initialValues: (platform.archs ?? [])
      .filter(item => !item.disabled && item.arch === store.currentArch)
      .map(item => item.arch),
    options: (platform.archs ?? []).map(item => ({
      label: item.color(item.name),
      value: item.arch,
      disabled: item.disabled,
      hint: item.disabled ? '当前系统架构不支持' : undefined,
    })),
  }))

  prompts.note(
    [
      `${pc.dim('压缩代码：')}${minify ? '是' : '否'}`,
      `${pc.dim('生成安装包：')}${isPackage ? '是' : '否'}`,
      `${pc.dim('构建平台：')}${platform.name}`,
      `${pc.dim('打包架构：')}${archs.join(' / ')}`,
    ].join('\n'),
    '构建配置确认',
  )

  const confirmed = ensure(await prompts.confirm({
    message: '确认以上配置并开始构建？',
    initialValue: true,
  }))

  if (!confirmed) {
    prompts.cancel('已取消构建')
    process.exit(0)
  }

  store.minify = minify
  store.dir = isPackage ? null : 'dir'
  store.targets = platform.createTarget(archs)
}
