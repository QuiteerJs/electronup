import type { ChildProcessWithoutNullStreams } from 'node:child_process'
import type { InlineConfig, Plugin, PluginOption } from 'vite'
import type { ElectronupConfig, PackConfig } from '../typings/electronup'
import { spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { createRequire, isBuiltin } from 'node:module'
import { isAbsolute, resolve } from 'node:path'
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
  // quiet : dotenv v17 默认每次加载都会打印提示日志
  const { parsed, error } = getEnv({ path, quiet: true })
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

type ExternalPattern = string | RegExp

/** 主进程 / preload 共用的 Node 侧构建参数 */
export interface NodeBuildOptions {
  entry: string | string[] | Record<string, string>
  outDir: string
  format: 'cjs' | 'esm'
  minify: boolean
  /** 额外不参与构建的模块 , electron 与 Node 内置模块始终不参与 */
  external?: ExternalPattern[]
  /** 强制参与构建的模块 , true 表示除 electron / 内置模块外全部打进产物 */
  noExternal?: ExternalPattern[] | true
  env?: Record<string, string>
  plugins?: PluginOption[]
  sourcemap?: boolean | 'inline' | 'hidden'
  /** 监听文件变化并重新构建 ( dev 下的主进程 ) */
  watch?: boolean
}

/** 取裸模块名对应的包名 : `foo/bar` -> `foo` , `@scope/foo/bar` -> `@scope/foo` */
function getPackageName(id: string) {
  const parts = id.split('/')
  return id.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0]
}

function matchPattern(id: string, patterns: ExternalPattern[]) {
  return patterns.some(pattern => typeof pattern === 'string'
    ? id === pattern || id.startsWith(`${pattern}/`)
    : pattern.test(id))
}

/** 读取项目 package.json 中运行时可用的依赖 ( dependencies / peerDependencies / optionalDependencies ) */
export function getRuntimeDependencies(root: string): Set<string> {
  try {
    const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))
    return new Set([pkg.dependencies, pkg.peerDependencies, pkg.optionalDependencies].flatMap(deps => Object.keys(deps ?? {})))
  }
  catch {
    return new Set()
  }
}

/**
 * 生成 rolldown 的 external 判断函数 , 与原 vite-plus pack 的默认行为保持一致 :
 * electron、Node 内置模块与项目运行时依赖不打包 ( electron-builder 会把 dependencies 装进安装包 ) ,
 * devDependencies 及其余模块打进产物 ; noExternal 优先于运行时依赖 , external 优先于 noExternal
 */
export function createExternal(options: Pick<NodeBuildOptions, 'external' | 'noExternal'>, root = store.root) {
  const { external = [], noExternal = [] } = options
  const dependencies = getRuntimeDependencies(root)

  return (id: string, _importer: string | undefined, isResolved: boolean) => {
    // 已解析的绝对路径与相对路径都是项目内部模块 , 交给打包流程
    if (isResolved || id.startsWith('.') || isAbsolute(id) || id.startsWith('\0'))
      {return false}
    if (isBuiltin(id) || id === 'electron' || id.startsWith('electron/') || matchPattern(id, external))
      {return true}
    if (noExternal === true || matchPattern(id, noExternal))
      {return false}
    return dependencies.has(getPackageName(id))
  }
}

/** 把环境变量转成 define , 与原 pack 的 env 一致 : 同时替换 process.env.X 与 import.meta.env.X */
export function envToDefine(env: Record<string, string>) {
  return Object.fromEntries(Object.entries(env).flatMap(([key, value]) => [
    [`process.env.${key}`, JSON.stringify(value)],
    [`import.meta.env.${key}`, JSON.stringify(value)],
  ]))
}

/**
 * 生成主进程 / preload 共用的 Vite 构建配置 ( SSR 构建 , 面向 Node 运行时 )
 *
 * 依赖是否打包完全由 createExternal 决定 ( ssr.noExternal: true 关闭 Vite 自身的外部化判断 ) ,
 * 不读取 vite.config 与 .env ( 环境变量由 electronup 统一注入 ) , 不复制 publicDir , 不清空输出目录
 */
export function createNodeBuildConfig(options: NodeBuildOptions): InlineConfig {
  const { entry, outDir, format, minify, env = {}, plugins = [], sourcemap = false, watch = false } = options

  return {
    configFile: false,
    envDir: false,
    root: store.root,
    publicDir: false,
    logLevel: 'warn',
    define: envToDefine(env),
    plugins: [globalProcessPlugin(), ...plugins],
    ssr: { target: 'node', noExternal: true },
    build: {
      ssr: true,
      outDir: resolve(store.root, outDir),
      emptyOutDir: false,
      copyPublicDir: false,
      // Electron 28 ( 最低支持版本 ) 内置 Node 18
      target: 'node18',
      minify,
      sourcemap,
      reportCompressedSize: false,
      watch: watch ? {} : null,
      rolldownOptions: {
        input: entry,
        external: createExternal(options),
        output: {
          format,
          entryFileNames: `[name].${format === 'esm' ? 'mjs' : 'cjs'}`,
          chunkFileNames: `chunks/[name]-[hash].${format === 'esm' ? 'mjs' : 'cjs'}`,
        },
      },
    },
  }
}

/** dev 下每次主进程构建写盘后 ( 含 watch 触发的重新构建 ) 启动 / 重启 Electron */
export function startElectronPlugin(mainPath: string): Plugin {
  return {
    name: 'electronup:start-electron',
    writeBundle() {
      startElectron(mainPath)
    },
  }
}

/**
 * Description  主进程代码编译配置 ( Vite SSR 构建 )
 * @param {any} config:PackConfig
 * @param {any} allConfig:ElectronupConfig
 * @returns {any}
 */
export function getPackConfig(config: PackConfig, allConfig: ElectronupConfig): InlineConfig {
  const { command, root, minify } = store
  const isServe = command === 'serve'
  const resourceDir = allConfig.resourceDir || DefaultDirs.resourceDir

  return createNodeBuildConfig({
    entry: { electron: resolve(root, allConfig.mainDir || DefaultDirs.mainDir, 'index.ts') },
    outDir: resourceDir,
    // 主进程强制 CJS , 与 preload 保持一致 , Electron 主进程对 CJS 兼容性最好
    format: 'cjs',
    // 默认压缩 ( dev / build 一致 ) , 显式传 --no-minify 时关闭
    minify: minify !== false && (minify === true || !isServe),
    external: config.external,
    noExternal: config.noExternal,
    env: injectEnv(),
    watch: isServe,
    plugins: isServe ? [startElectronPlugin(resolve(root, resourceDir, 'electron.cjs'))] : [],
  })
}

/** 预检主进程入口 ( mainDir/index.ts ) 是否存在 , 不存在时抛错 */
export function assertMainEntry(allConfig: ElectronupConfig) {
  const entry = resolve(store.root, allConfig.mainDir || DefaultDirs.mainDir, 'index.ts')
  if (!existsSync(entry))
    {throw new Error(`找不到主进程入口 : ${entry} ( 可通过 mainDir 配置主进程目录 )`)}
}

/**
 * Description 从用户项目根解析 electron 可执行文件路径
 * Description  electron 为 peer 依赖 , pnpm 严格隔离下只能从用户项目解析
 * Description  解析失败时抛出带安装提示的错误 , dev 启动前会先调用一次做预检
 * @returns {any}
 */
export function getElectronBinary(): string {
  const requireFromRoot = createRequire(resolve(store.root, 'package.json'))
  try {
    // electron 在普通 Node 下的 module.exports 就是可执行文件路径
    return requireFromRoot('electron')
  }
  catch (error: any) {
    if (error?.code === 'MODULE_NOT_FOUND')
      {throw new Error('未在项目中找到 electron , 请先安装 : pnpm add -D electron ( 或 npm i -D electron )', { cause: error })}
    // electron 包已安装但可执行文件下载失败时 , electron 自身会抛出 "Electron failed to install correctly"
    throw new Error(`electron 无法使用 : ${error?.message ?? error}`, { cause: error })
  }
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
