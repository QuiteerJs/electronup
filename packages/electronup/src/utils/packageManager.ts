import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

export interface DetectedPackageManager {
  name: 'pnpm' | 'yarn' | 'bun' | 'npm'
  version?: string
  /** 命中 packageManager 字段或 lockfile 的目录 */
  dir: string
}

const LOCKFILES: Array<[string, DetectedPackageManager['name']]> = [
  ['pnpm-lock.yaml', 'pnpm'],
  ['yarn.lock', 'yarn'],
  ['bun.lock', 'bun'],
  ['bun.lockb', 'bun'],
  ['package-lock.json', 'npm'],
]

function readPackageManagerField(dir: string): Pick<DetectedPackageManager, 'name' | 'version'> | undefined {
  try {
    const { packageManager } = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'))
    const [name, version] = String(packageManager ?? '').split('@')
    if (LOCKFILES.some(([, pm]) => pm === name))
      {return { name: name as DetectedPackageManager['name'], version }}
  }
  catch {}
  return undefined
}

/**
 * 从 root 向上查找最近的 packageManager 字段或 lockfile ( 同一目录内字段优先 )
 *
 * pnpm / yarn workspace 子项目自身没有 lockfile , 需要找到 workspace 根
 */
export function detectPackageManager(root: string): DetectedPackageManager | undefined {
  let dir = path.resolve(root)

  while (true) {
    const field = readPackageManagerField(dir)
    if (field)
      {return { ...field, dir }}

    const lock = LOCKFILES.find(([file]) => fs.existsSync(path.join(dir, file)))
    if (lock)
      {return { name: lock[1], dir }}

    const parent = path.dirname(dir)
    if (parent === dir)
      {return undefined}
    dir = parent
  }
}

/**
 * 未经包管理器启动 ( 直接 `node electronup.mjs` 、IDE 调试等 ) 时 , 把检测结果写入 npm_config_user_agent
 *
 * electron-builder 只在 projectDir 查找 packageManager 字段 / lockfile , 找不到时读取 npm_config_user_agent /
 * npm_execpath , 再找不到就回退为 npm ; workspace 子项目因此会被误判 , 依赖收集走 npm 的逻辑
 */
export function hintPackageManager(root: string, env: NodeJS.ProcessEnv = process.env): DetectedPackageManager | undefined {
  if (env.npm_config_user_agent || env.npm_execpath)
    {return undefined}

  const detected = detectPackageManager(root)
  if (detected)
    {env.npm_config_user_agent = `${detected.name}/${detected.version || 'unknown'} electronup`}

  return detected
}
