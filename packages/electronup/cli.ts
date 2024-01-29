#!/usr/bin/env node
import { resolve } from 'node:path'
import fs from 'node:fs'
import { cac } from 'cac'
import { version } from './package.json'
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
  o?: true
  option?: true
  win?: true | 'ia32' | 'x64'
  mac?: true | 'x64' | 'arm64' | 'universal'
  linux?: true
  dir?: true
  asar: boolean
}

const cli = cac('electronup')

cli.option('-m , --mode <mode>', '[development | production | test | staging | ...] 环境模式 ')
cli.option('--no-minify', '使主进程和渲染进程代码不进行压缩 ')

cli
  .command('[config-file]', '等同于electronup dev ,启动开发环境热更新') // default command
  .alias('dev')
  .option('-p , --port <port>', '[number] 渲染进程的端口号 ，如果占用会切换非占用的端口 ')
  .action(async (configFile: undefined | string, options: DevOptions) => {
    const { mode, port, minify } = options

    const option = await getConfig(configFile)

    emptyDir(resolve(store.root, option.resourceDir || DefaultDirs.resourceDir))

    store.command = 'serve'
    store.mode = (mode || 'development')
    store.port = (port || 8090)
    store.minify = !!minify

    watch(option)
  })

cli
  .command('build [root]', '开始构建服务 , 若不指定平台则默认当前操作系统的架构类型')
  .option('-o , --option', '自定义 , 自定义构建选项 ')
  .option('--dir', '只生成目录')
  .option('--no-asar', 'asar false')
  .option('--win [arch]', '[ia32 | x64] 构建 win 平台下的输出包 , 不指定架构则输出 ia32 和 x64的两个包')
  .option('--mac [arch]', '[x64 | arm64 | universal] 构建 mac 平台下的输出包 , 若不指定架构则默认当前操作系统的架构类型')
  .option('--linux', '[x64 | arm64 | armv7l] 构建 linux 平台下的输出包 , 若不指定架构则默认当前操作系统的架构类型')
  .action(async (configFile: undefined | string, options: BuildOptions) => {
    const {
      mode, minify, option,
      win, mac, linux,
      dir, asar
    } = options

    const configOption = await getConfig(configFile)

    emptyDir(resolve(store.root, configOption.resourceDir || DefaultDirs.resourceDir))
    emptyDir(resolve(store.root, configOption.outDir || DefaultDirs.outDir))

    store.command = 'build'
    store.mode = (mode || 'production')
    store.minify = minify
    store.option = !!option
    store.dir = dir ? 'dir' : null
    store.asar = asar
    store.win = win
    store.mac = mac
    store.linux = linux

    build(configOption)
  })

cli.help()
cli.version(version)
cli.parse()

function emptyDir(dir: string) {
  if (!fs.existsSync(dir))
    return

  for (const file of fs.readdirSync(dir))
    fs.rmSync(resolve(dir, file), { recursive: true, force: true })
}
