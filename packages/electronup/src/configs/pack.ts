import type { ChildProcessWithoutNullStreams } from 'node:child_process'
import type { InlineConfig, Plugin, PluginOption } from 'vite'
import type { ElectronupConfig, PackConfig } from '../typings/electronup'
import { spawn } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { createRequire, isBuiltin } from 'node:module'
import { dirname, isAbsolute, resolve } from 'node:path'
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

/** 从 root 向上查找 node_modules 下的包 package.json , 找不到返回 undefined */
function readInstalledPackage(name: string, root: string): Record<string, any> | undefined {
  for (let dir = root; ; dir = dirname(dir)) {
    const file = resolve(dir, 'node_modules', name, 'package.json')
    if (existsSync(file)) {
      try { return JSON.parse(readFileSync(file, 'utf8')) }
      catch { return undefined }
    }
    if (dirname(dir) === dir) { return undefined }
  }
}

const REQUIRE_CONDITIONS = new Set(['node', 'require', 'default'])

/** exports 条目在 require 时是否能命中某个文件 ( 只看 node / require / default 条件 ) */
function hasRequireTarget(entry: unknown): boolean {
  if (typeof entry === 'string') { return true }
  if (Array.isArray(entry)) { return entry.some(hasRequireTarget) }
  if (entry && typeof entry === 'object')
    {return Object.entries(entry).some(([key, value]) => REQUIRE_CONDITIONS.has(key) && hasRequireTarget(value))}
  return false
}

/** 在 exports 里找 subpath ( `.` / `./sub` ) 对应的条目 , 支持单个 `*` 通配 */
function findExportsEntry(exports: unknown, subpath: string): unknown {
  const isSubpathMap = exports && typeof exports === 'object' && !Array.isArray(exports)
    && Object.keys(exports).some(key => key.startsWith('.'))
  if (!isSubpathMap) { return subpath === '.' ? exports : undefined }

  const map = exports as Record<string, unknown>
  if (subpath in map) { return map[subpath] }
  for (const [key, value] of Object.entries(map)) {
    const star = key.indexOf('*')
    if (star !== -1 && subpath.startsWith(key.slice(0, star)) && subpath.endsWith(key.slice(star + 1)))
      {return value}
  }
  return undefined
}

/**
 * 运行时依赖是否只能 import 不能 require ( exports 里该路径只有 import 条件 ) .
 * 这类包留在 CJS 产物里运行期 require 会报 ERR_PACKAGE_PATH_NOT_EXPORTED , 需要打进产物
 */
export function isImportOnly(id: string, root: string) {
  const name = getPackageName(id)
  const pkg = readInstalledPackage(name, root)
  if (!pkg || pkg.exports === undefined) { return false }
  const entry = findExportsEntry(pkg.exports, id === name ? '.' : `.${id.slice(name.length)}`)
  return entry != null && !hasRequireTarget(entry)
}

/**
 * 生成 rolldown 的 external 判断函数 , 与原 vite-plus pack 的默认行为保持一致 :
 * electron、Node 内置模块与项目运行时依赖不打包 ( electron-builder 会把 dependencies 装进安装包 ) ,
 * devDependencies 及其余模块打进产物 ; noExternal 优先于运行时依赖 , external 优先于 noExternal .
 * 输出 CJS 时 , 只能 import 的运行时依赖 ( 纯 ESM 包 ) 也打进产物 , 否则运行期 require 会失败
 */
export function createExternal(options: Pick<NodeBuildOptions, 'external' | 'noExternal'> & Partial<Pick<NodeBuildOptions, 'format'>>, root = store.root) {
  const { external = [], noExternal = [], format = 'cjs' } = options
  const dependencies = getRuntimeDependencies(root)
  const importOnly = new Map<string, boolean>()
  const checkImportOnly = (id: string) => {
    if (!importOnly.has(id)) { importOnly.set(id, isImportOnly(id, root)) }
    return importOnly.get(id)!
  }

  return (id: string, _importer: string | undefined, isResolved: boolean) => {
    // 已解析的绝对路径与相对路径都是项目内部模块 , 交给打包流程
    if (isResolved || id.startsWith('.') || isAbsolute(id) || id.startsWith('\0'))
      {return false}
    if (isBuiltin(id) || id === 'electron' || id.startsWith('electron/') || matchPattern(id, external))
      {return true}
    if (noExternal === true || matchPattern(id, noExternal))
      {return false}
    if (!dependencies.has(getPackageName(id)))
      {return false}
    return format !== 'cjs' || !checkImportOnly(id)
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
    entry: { electron: resolveMainEntry(allConfig) },
    outDir: resourceDir,
    // 主进程强制 CJS , 与 preload 保持一致 , Electron 主进程对 CJS 兼容性最好
    format: 'cjs',
    // build 默认压缩 , 显式传 --no-minify 时关闭 ; dev 下 store.minify 恒为 false
    minify: minify !== false,
    // dev 生成 sourcemap , 配合 --enable-source-maps 让报错堆栈指向源码
    sourcemap: isServe,
    external: config.external,
    noExternal: config.noExternal,
    env: injectEnv(),
    watch: isServe,
    plugins: isServe ? [startElectronPlugin(resolve(root, resourceDir, 'electron.cjs'))] : [],
  })
}

/** 主进程入口文件名 , 按顺序取第一个存在的 */
export const MAIN_ENTRY_FILES = ['index.ts', 'index.mts', 'index.cts', 'index.js', 'index.mjs', 'index.cjs']

/** 主进程入口 : mainDir 下第一个存在的 index.{ts,mts,cts,js,mjs,cjs} , 都不存在时返回 index.ts ( 由 assertMainEntry 报错 ) */
export function resolveMainEntry(allConfig: ElectronupConfig) {
  const dir = resolve(store.root, allConfig.mainDir || DefaultDirs.mainDir)
  const file = MAIN_ENTRY_FILES.find(name => existsSync(resolve(dir, name))) ?? MAIN_ENTRY_FILES[0]
  return resolve(dir, file)
}

/** 预检主进程入口是否存在 , 不存在时抛错 */
export function assertMainEntry(allConfig: ElectronupConfig) {
  const entry = resolveMainEntry(allConfig)
  if (!existsSync(entry)) {
    const dir = resolve(store.root, allConfig.mainDir || DefaultDirs.mainDir)
    throw new Error(`找不到主进程入口 : ${dir} 下没有 ${MAIN_ENTRY_FILES.join(' / ')} ( 可通过 mainDir 配置主进程目录 )`)
  }
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

let electronProcess: ChildProcessWithoutNullStreams | null = null
/** 最近一次启动 Electron 使用的主进程入口 , preload 重新构建后据此重启 */
let lastMainPath: string | null = null
/** 已请求旧进程退出 , 退出后用 lastMainPath 启动新进程 */
let restartQueued = false

/** Electron 已启动时用上一次的主进程入口重启 ; 尚未启动 ( 主进程首次构建未完成 ) 时不做处理 */
export function restartElectron() {
  if (electronProcess && lastMainPath)
    {startElectron(lastMainPath)}
}

/**
 * 启动 Electron ; 已在运行时先结束旧进程 , 等它真正退出后再启动新进程 ,
 * 避免单实例锁、端口等仍被旧进程占用 . 等待期间的多次重启合并为一次
 */
function startElectron(mainPath: string) {
  lastMainPath = mainPath
  if (!electronProcess) {
    spawnElectron(mainPath)
    return
  }
  if (!restartQueued) {
    restartQueued = true
    electronProcess.kill()
  }
}

function spawnElectron(mainPath: string) {
  const env = { ...process.env, ...injectEnv(), NODE_OPTIONS: withSourceMaps(process.env.NODE_OPTIONS) }
  const child = spawn(getElectronBinary(), [mainPath], { env })
  electronProcess = child

  child.stdout.on('data', chunk => removeJunk(chunk))
  // oxlint-disable-next-line no-console
  child.stderr.on('data', chunk => removeJunk(chunk, console.error))

  // 用 exit 而不是 close : Electron 的子进程可能继承 stdio , close 会等它们全部退出
  child.on('exit', () => {
    electronProcess = null
    if (restartQueued) {
      restartQueued = false
      spawnElectron(lastMainPath ?? mainPath)
      return
    }
    // 用户关闭了窗口 ( 非 electronup 发起的重启 ) , dev 随之退出
    process.exit()
  })
}

/** 在已有 NODE_OPTIONS 后追加 --enable-source-maps , 让 dev 下主进程报错堆栈映射回源码 */
export function withSourceMaps(nodeOptions = '') {
  return nodeOptions.includes('--enable-source-maps')
    ? nodeOptions
    : `${nodeOptions} --enable-source-maps`.trim()
}

const JUNK_LINES = [
  /\d+-\d+-\d+ \d+:\d+:\d+\.\d+ Electron(?: Helper)?\[\d+:\d+\] /,
  /\[\d+:\d+\/|\d+\.\d+:ERROR:CONSOLE\(\d+\)\]/,
  /ALSA lib [a-z]+\.c:\d+:\([a-z_]+\)/,
]

/**
 * 过滤 Electron 进程输出的固定格式噪音日志
 *
 * child_process 的 stdout / stderr 'data' 事件传入的 chunk 默认是 Buffer ,
 * 旧实现 ( tsdown.ts ) 里先 chunk.toString() 再处理 ; 这里必须同样先转字符串 ,
 * 否则 Electron 一旦有输出就会抛 `chunk.split is not a function` ; stderr 传入 console.error
 */
// oxlint-disable-next-line no-console
export function removeJunk(chunk: Buffer | string, log: (message: string) => void = console.info) {
  // 逐行过滤 : 同一个 chunk 里可能混有噪音行与正常日志 , 只丢弃噪音行
  const lines = chunk.toString().split(/\r?\n/).filter(line => !JUNK_LINES.some(pattern => pattern.test(line)))
  if (!lines.some(line => line.trim()))
    {return}

  log(lines.map(line => `  ${line}`).join('\n'))
}
