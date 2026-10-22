import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'

/** 不允许出现在清理目标路径中的目录名 */
const FORBIDDEN_SEGMENTS = new Set(['node_modules', '.git'])

/** rename 失败时视为"目录或文件被占用"的错误码 */
const BUSY_CODES = new Set(['EBUSY', 'EPERM', 'EACCES'])

export interface CleanCheckOptions {
  /** 项目根目录 */
  root: string
  /** 用户主目录 , 默认 os.homedir() , 便于测试注入 */
  home?: string
}

export interface CleanCheckResult {
  /** 解析后的绝对路径 */
  dir: string
  /** 目标位于项目根目录之外 */
  outsideRoot: boolean
}

/** child 与 parent 相同或位于 parent 之内 ( Windows 下大小写不敏感 , 由 path.relative 处理 ) */
function isSameOrInside(parent: string, child: string) {
  const rel = path.relative(parent, child)
  if (rel === '') { return true }
  return rel !== '..' && !rel.startsWith(`..${path.sep}`) && !path.isAbsolute(rel)
}

function safeRealpath(p: string) {
  try {
    return fs.realpathSync.native(p)
  }
  catch {
    return p
  }
}

/** 对单个路径套用全部规则 , 返回拒绝原因 ; 合法时返回 undefined */
function checkRules(dir: string, root: string, home: string): string | undefined {
  if (path.dirname(dir) === dir) { return '不能是文件系统根目录' }
  if (isSameOrInside(dir, root)) { return '不能是项目根目录或其上级目录' }
  if (home && isSameOrInside(dir, home)) { return '不能是用户主目录或其上级目录' }

  // 项目内只检查相对部分 , 避免项目本身位于 node_modules 等目录下时误判
  const scope = isSameOrInside(root, dir) ? path.relative(root, dir) : dir
  const hit = scope.split(/[\\/]+/).find(segment => FORBIDDEN_SEGMENTS.has(segment))
  if (hit) { return `路径中不能包含 ${hit} 目录` }

  return undefined
}

/**
 * 校验清理目标是否安全 , 不安全时抛错 ( 不做任何删除 )
 *
 * 规则 : 拒绝文件系统根、项目根及其上级、用户主目录及其上级、包含 node_modules / .git 的路径 ,
 * 拒绝目标本身是符号链接 / junction ( rmSync 会跟随删除链接目标 ) , 并对 realpath 再校验一次
 */
export function assertSafeCleanTarget(target: string, options: CleanCheckOptions): CleanCheckResult {
  const root = path.resolve(options.root)
  const home = options.home ?? os.homedir()
  const dir = path.resolve(root, target)

  const reject = (reason: string): never => {
    throw new Error(`拒绝清理目录 ${dir} : ${reason}。请检查 resourceDir / outDir 配置`)
  }

  const reason = checkRules(dir, root, home)
  if (reason) { reject(reason) }

  if (fs.existsSync(dir)) {
    const stat = fs.lstatSync(dir)
    if (stat.isSymbolicLink()) { reject('目标本身是符号链接或 junction , 清理会删除链接指向的内容') }
    if (!stat.isDirectory()) { reject('目标已存在且不是目录') }

    // 上级目录中可能含链接 , 用真实路径再校验一次
    const realDir = safeRealpath(dir)
    const realRoot = safeRealpath(root)
    const realHome = home ? safeRealpath(home) : home
    const realReason = checkRules(realDir, realRoot, realHome)
    if (realReason) { reject(`真实路径 ${realDir} ${realReason}`) }
  }

  return { dir, outsideRoot: !isSameOrInside(root, dir) }
}

/**
 * 清空目录 : 先整体 rename 到同级临时目录 , 成功后重建空目录再删除临时目录
 *
 * rename 是原子操作 , 被占用 ( Windows 下 EBUSY / EPERM ) 时整体失败 , 原有产物保持不变 ,
 * 不会出现"一半旧产物 + 一半新产物"的状态
 */
export function emptyDir(dir: string) {
  if (!fs.existsSync(dir)) { return }

  const trash = path.join(path.dirname(dir), `.${path.basename(dir)}.electronup-trash-${process.pid}-${Date.now()}`)

  try {
    fs.renameSync(dir, trash)
  }
  catch (error: any) {
    const code = error?.code as string | undefined
    const hint = code && BUSY_CODES.has(code)
      ? '目录或其中的文件正被占用 , 请关闭正在运行的应用 / 资源管理器窗口后重试'
      : '请检查目录权限'
    throw new Error(`无法清理目录 ${dir} ( ${code ?? error?.message} ) : ${hint}。原有产物未做任何改动`, { cause: error })
  }

  fs.mkdirSync(dir, { recursive: true })

  try {
    fs.rmSync(trash, { recursive: true, force: true })
  }
  catch {
    // 旧产物已移出输出目录 , 不影响本次构建 , 只提示用户手动删除
    console.error(`[electronup] 旧产物已移至 ${trash} , 但删除失败 , 请稍后手动删除`)
  }
}

/**
 * 先校验全部目标 , 全部通过后再逐个清空 ; 任一目标不合法时不删除任何内容
 */
export function cleanDirs(targets: string[], options: CleanCheckOptions) {
  const checked = targets.map(target => assertSafeCleanTarget(target, options))

  for (const { dir, outsideRoot } of checked) {
    if (outsideRoot) { console.error(`[electronup] 注意 : 将清空项目目录之外的 ${dir}`) }
  }

  for (const { dir } of checked) { emptyDir(dir) }

  return checked.map(item => item.dir)
}
