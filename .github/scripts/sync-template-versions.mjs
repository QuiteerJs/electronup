import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'

// 让 electronup-template 各分支依赖的 electronup 与 @quiteer/electron-* 版本跟随本仓库 :
// 版本号唯一的来源是 packages/*/package.json , 模板里已声明的同名依赖改为 ^<当前版本>
//
// 用法 :
//   node .github/scripts/sync-template-versions.mjs --list           输出模板分支名 JSON 数组
//   node .github/scripts/sync-template-versions.mjs <模板目录>        改写模板 package.json
//   node .github/scripts/sync-template-versions.mjs <模板目录> --check  只检查 , 有落后的依赖时退出码为 1
// 在 GitHub Actions 中会向 GITHUB_OUTPUT 写入 changed 与 summary

const repoRoot = resolve(fileURLToPath(import.meta.url), '../../..')
const depFields = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']

/** 本仓库会发布的包 : 包名 → 版本 */
export function readWorkspaceVersions(root = repoRoot) {
  const versions = {}
  for (const dir of readdirSync(join(root, 'packages'))) {
    let pkg
    try {
      pkg = JSON.parse(readFileSync(join(root, 'packages', dir, 'package.json'), 'utf8'))
    }
    catch {
      continue
    }
    if (!pkg.private && pkg.name && pkg.version) {
      versions[pkg.name] = pkg.version
    }
  }
  return versions
}

const parse = v => v.split('.').map(Number)

function compare(a, b) {
  const [x, y] = [parse(a), parse(b)]
  for (let i = 0; i < 3; i++) {
    if (x[i] !== y[i]) {
      return x[i] - y[i]
    }
  }
  return 0
}

/**
 * 计算模板 package.json 需要改动的依赖 . 只处理 ^x.y.z / ~x.y.z / x.y.z 这类普通写法 ,
 * 只升不降 , 预发布版本不同步 ( 模板应跟随正式版 )
 */
export function planUpdates(pkg, versions) {
  const updates = []
  for (const field of depFields) {
    for (const [name, spec] of Object.entries(pkg[field] ?? {})) {
      const version = versions[name]
      const current = /^[\^~]?(\d+\.\d+\.\d+)$/.exec(spec)?.[1]
      if (!version || !current || !/^\d+\.\d+\.\d+$/.test(version) || compare(version, current) <= 0) {
        continue
      }
      updates.push({ field, name, from: spec, to: `^${version}` })
    }
  }
  return updates
}

/** 版本已在 npm 官方注册表上 ( 刚打标签、尚未发布完成的版本不能写进模板 ) */
async function isPublished(name, version) {
  const res = await fetch(`https://registry.npmjs.org/${name.replace('/', '%2f')}/${version}`)
  return res.ok
}

async function main(args) {
  if (args.includes('--list')) {
    const { TEMPLATES } = await import(pathToFileURL(join(repoRoot, 'packages/create-electronup/src/utils.ts')).href)
    // oxlint-disable-next-line no-console
    console.log(JSON.stringify(TEMPLATES))
    return 0
  }

  const dir = args.find(a => !a.startsWith('--'))
  if (!dir) {
    console.error('用法：sync-template-versions.mjs <模板目录> [--check] | --list')
    return 1
  }

  const pkgPath = resolve(dir, 'package.json')
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
  const updates = []
  for (const update of planUpdates(pkg, readWorkspaceVersions())) {
    const version = update.to.slice(1)
    if (await isPublished(update.name, version)) {
      updates.push(update)
    }
    else {
      console.error(`跳过 ${update.name}@${version}：npm 上还没有这个版本`)
    }
  }

  const summary = updates.map(u => `${u.name} ${u.from} → ${u.to}`).join(', ')
  // oxlint-disable-next-line no-console
  console.log(updates.length ? `需要更新：${summary}` : '模板依赖已是最新')

  if (process.env.GITHUB_OUTPUT) {
    writeFileSync(process.env.GITHUB_OUTPUT, `changed=${updates.length > 0}\nsummary=${summary}\n`, { flag: 'a' })
  }

  if (args.includes('--check')) {
    return updates.length ? 1 : 0
  }
  for (const { field, name, to } of updates) {
    pkg[field][name] = to
  }
  if (updates.length) {
    writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`)
  }
  return 0
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  process.exitCode = await main(process.argv.slice(2))
}
