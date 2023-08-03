#!/usr/bin/env node
import { resolve } from 'path'
import { cac } from 'cac'
import { sync } from 'rimraf'
import { version } from '../package.json'
import { getConfig } from './transform'
import { DefaultDirs, store } from './utils'
import { build, watch } from './runner'

interface Options {
  m?: string
  mode?: string
  minify: boolean
}

interface DevOptions extends Options {
  p?: number
  port?: number
}

interface BuildOptions extends Options {
  o?: boolean
  option?: boolean
  win?: boolean
  mac?: boolean
  linux?: boolean
  ia32?: boolean
  x64?: boolean
  arm64?: boolean
  armv7l?: boolean
  universal?: boolean
  dir?: boolean
  asar: boolean
}

const cli = cac('electronup')

cli.option('-m , --mode <mode>', '[development | production | test | staging | ...] 环境模式 ')
cli.option('--no-minify', '使主进程和渲染进程代码压缩 ')

cli
  .command('[config-file]', 'start dev server') // default command
  .alias('dev')
  .option('-p , --port <port>', '[number] 渲染进程的端口号 ，如果占用会切换非占用的端口 ')
  .action(async (configFile: undefined | string, options: DevOptions) => {
    const { mode, port, minify } = options

    const option = await getConfig(configFile)

    sync(resolve(store.root, option.resourceDir || DefaultDirs.resourceDir))
    sync(resolve(store.root, option.outDir || DefaultDirs.outDir))

    store.command = 'serve'
    store.mode = (mode || 'development')
    store.port = (port || 8090)
    store.minify = !!minify

    watch(option)
  })

cli
  .command('build [root]', '构建')
  .option('-o , --option', '自定义 , 自定义构建选项 ')
  .option('--dir', '只生成目录')
  .option('--no-asar', 'asar false')
  .option('--win', ' 构建 win 下输出包')
  .option('--mac', ' 构建 mac 下输出包')
  .option('--linux', ' 构建 linux 输出包')
  .option('--ia32', ' 构建 ia32 平台包')
  .option('--x64', ' 构建 x64 平台包')
  .option('--arm64', ' 构建 arm64 平台包')
  .option('--armv7l', ' 构建 armv7l 平台包')
  .option('--universal', ' 构建 universal 平台包')
  .action(async (configFile: undefined | string, options: BuildOptions) => {
    const {
      mode, minify, option,
      win, mac, linux,
      ia32, x64, arm64, armv7l, universal,
      dir, asar
    } = options

    const configOption = await getConfig(configFile)

    sync(resolve(store.root, configOption.resourceDir || DefaultDirs.resourceDir))
    sync(resolve(store.root, configOption.outDir || DefaultDirs.outDir))

    store.command = 'build'
    store.mode = (mode || 'production')
    store.minify = minify
    store.option = !!option
    store.dir = !!dir
    store.asar = asar
    store.win = !!win
    store.mac = !!mac
    store.linux = !!linux
    store.ia32 = !!ia32
    store.x64 = !!x64
    store.arm64 = !!arm64
    store.armv7l = !!armv7l
    store.universal = !!universal

    build(configOption)
  })

cli.help()
cli.version(version)
cli.parse()
