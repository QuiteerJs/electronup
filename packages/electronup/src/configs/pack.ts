import type { ChildProcessWithoutNullStreams } from 'node:child_process'
import type { UserConfig } from 'vite-plus/pack'
import type { ElectronupConfig, PackConfig } from '../typings/electronup'
import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import process from 'node:process'
import { config as getEnv } from 'dotenv'
import { DefaultDirs, store } from '../utils'

/**
 * Description  全局的环境变量路径
 * @param {any} store.root
 * @param {any} '.env'
 * @returns {any}
 */
const defaultEnvPath = resolve(store.root, '.env')

/** 可选地加载一个 dotenv 文件 , 文件缺失时返回 {} 而不是报错 */
function loadOptionalEnv(path: string): Record<string, string> {
  const { parsed, error } = getEnv({ path })
  if (error) { return {} }
  return parsed ?? {}
}

/** 合并 .env + .env.{mode} 两层环境变量 , mode 文件缺失时仅使用默认层 */
function getModeDev() {
  const defaultEnv = loadOptionalEnv(defaultEnvPath)
  const modeEnv = loadOptionalEnv(`${defaultEnvPath}.${store.mode}`)

  return {
    ...defaultEnv,
    ...modeEnv,
  }
}

/**
 * Description 插入环境变量
 * @returns {any}
 */
export function injectEnv() {
  const { command, port } = store

  const env = getModeDev()
  if (command === 'serve') {
    return {
      ...env,
      NODE_ENV: 'development',
      RENDER_PORT: String(port),
    }
  }

  return {
    ...env,
    NODE_ENV: 'production',
  }
}

const PROCESS_IMPORT = /^[ \t]*import\s+process\s+from\s*(['"])(?:node:)?process\1[ \t]*;?/gm

/**
 * 去掉用户源码中的 `import process from 'node:process'` ( 或 'process' ) , 让 process 回到全局引用
 *
 * env 注入基于 define ( process.env.X ) , 只匹配全局 process ; 带 import 时 Rolldown 会改写为
 * `node_process.default.env.X` , define 匹配不到 . node:process 的默认导出就是全局 process , 运行时等价 .
 * 用等长空白替换 , 不改变代码位置 , 无需 sourcemap
 */
export function globalProcessPlugin() {
  return {
    name: 'electronup:global-process',
    transform(code: string, id: string) {
      if (id.includes('node_modules') || !/\.[cm]?[jt]sx?$/.test(id) || !code.includes('process'))
        {return null}

      const next = code.replace(PROCESS_IMPORT, match => match.replace(/[^\r\n]/g, ' '))
      return next === code ? null : { code: next, map: null }
    },
  }
}

/**
 * Description  主进程代码编译配置
 * @param {any} config:PackConfig
 * @param {any} allConfig:ElectronupConfig
 * @returns {any}
 */
export function getPackConfig(config: PackConfig, allConfig: ElectronupConfig) {
  const { command, root, minify } = store
  const isServe = command === 'serve'

  const defaultConfig: UserConfig = {
    // 默认压缩 ( dev / build 一致 ) , 显式传 --no-minify 时关闭
    minify: minify !== false && (minify === true || !isServe),
    external: ['electron', ...(config.external ?? [])],
    noExternal: config.noExternal,
    entry: { electron: resolve(root, allConfig.mainDir || DefaultDirs.mainDir, 'index.ts') },
    outDir: allConfig.resourceDir || DefaultDirs.resourceDir,
    watch: isServe,
    // 主进程强制 CJS , 与 preload 保持一致 , Electron 主进程对 CJS 兼容性最好
    format: 'cjs',
    dts: false,
    clean: false,
    env: injectEnv(),
    plugins: [globalProcessPlugin()],
    async onSuccess() {
      if (isServe) { return startElectron(resolve(root, allConfig.resourceDir || DefaultDirs.resourceDir, 'electron.cjs')) }
    },
  }

  return { ...defaultConfig }
}

/**
 * Description 从用户项目根解析 electron 可执行文件路径
 * Description  electron 为 peer 依赖 , pnpm 严格隔离下只能从用户项目解析
 * @returns {any}
 */
function getElectronBinary(): string {
  const requireFromRoot = createRequire(resolve(store.root, 'package.json'))
  // electron 在普通 Node 下的 module.exports 就是可执行文件路径
  return requireFromRoot('electron')
}

let electronProcess: ChildProcessWithoutNullStreams | null
let manualRestart = false

/**
 * Description  启动electron
 * @param {any} mainPath:string
 * @returns {any}
 */
function startElectron(mainPath: string) {
  if (electronProcess) {
    manualRestart = true
    if (electronProcess?.pid) {
      process.kill(electronProcess.pid)
    }
    electronProcess = null

    setTimeout(() => {
      manualRestart = false
    }, 5000)
  }

  const env = { ...process.env, ...injectEnv() }
  electronProcess = spawn(getElectronBinary(), [mainPath], { env })

  electronProcess.stdout.on('data', removeJunk)

  electronProcess.stderr.on('data', removeJunk)

  electronProcess.on('close', () => {
    if (!manualRestart) {
      process.exit()
    }
  })
}

/**
 * 过滤 Electron 进程输出的固定格式噪音日志
 *
 * child_process 的 stdout / stderr 'data' 事件传入的 chunk 默认是 Buffer ,
 * 旧实现 ( tsdown.ts ) 里先 chunk.toString() 再处理 ; 这里必须同样先转字符串 ,
 * 否则 Electron 一旦有输出就会抛 `chunk.split is not a function`
 */
export function removeJunk(chunk: Buffer | string) {
  const text = chunk.toString()
  if (/\d+-\d+-\d+ \d+:\d+:\d+\.\d+ Electron(?: Helper)?\[\d+:\d+\] /.test(text)) { return }
  if (/\[\d+:\d+\/|\d+\.\d+:ERROR:CONSOLE\(\d+\)\]/.test(text)) { return }
  if (/ALSA lib [a-z]+\.c:\d+:\([a-z_]+\)/.test(text)) { return }

  const data = text.split(/\r?\n/)
  let log = ''
  data.forEach((line) => {
    log += `  ${line}\n`
  })
  // oxlint-disable-next-line no-console
  console.info(log)
}
