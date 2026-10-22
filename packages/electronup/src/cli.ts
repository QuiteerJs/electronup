#!/usr/bin/env node

import { cac } from 'cac'
import { version } from '../package.json'
import { build, watch } from './runner'
import { getConfig, resolveElectronupConfig } from './transform'
import { store } from './utils'

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
  linux?: true | 'x64' | 'arm64' | 'armv7l'
  dir?: true
  web?: boolean
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

    // store.command 需在执行函数式配置前设置 ( 作为 ConfigEnv 传给用户 )
    store.command = 'serve'
    store.mode = (mode || 'development')
    store.port = (port || 8090)
    store.minify = minify

    // 先执行函数式 / 异步配置得到最终对象 , 清理由 watch 在拿到真实 resourceDir 后进行
    const option = await resolveElectronupConfig(await getConfig(configFile))

    await watch(option)
  })

cli
  .command('build [config-file]','开始构建服务 , 若不指定平台则默认当前操作系统的架构类型')
  .option('-o , --option', '自定义 , 自定义构建选项 ')
  .option('--dir', '只生成目录')
  .option('--web', '只构建渲染进程 ( web ) , 不构建主进程 / preload , 也不生成安装包')
  .option('--no-asar', 'asar false')
  .option('--win [arch]', '[ia32 | x64] 构建 win 平台下的输出包 , 不指定架构则输出 ia32 和 x64的两个包')
  .option('--mac [arch]', '[x64 | arm64 | universal] 构建 mac 平台下的输出包 , 若不指定架构则默认当前操作系统的架构类型')
  .option('--linux [arch]', '[x64 | arm64 | armv7l] 构建 linux 平台下的输出包 , 若不指定架构则默认当前操作系统的架构类型')
  .action(async (configFile: undefined | string, options: BuildOptions) => {
    const {
      mode,
      minify,
      option,
      win,
      mac,
      linux,
      dir,
      web,
      asar,
    } = options

    store.command = 'build'
    store.mode = (mode || 'production')
    // build 默认压缩 , 只有显式 --no-minify 时才关闭
    store.minify = minify !== false
    store.option = !!option
    store.dir = dir ? 'dir' : null
    store.web = !!web
    // cac 对 --no-asar 的默认值是 true , 只有显式传 --no-asar 时才是 false
    store.asar = asar === false ? false : undefined
    store.win = win
    store.mac = mac
    store.linux = linux

    // 先执行函数式 / 异步配置得到最终对象 ; 清理由 build 在目标校验之后进行
    const configOption = await resolveElectronupConfig(await getConfig(configFile))

    await build(configOption)
  })

cli.help()
cli.version(version)
cli.parse()
