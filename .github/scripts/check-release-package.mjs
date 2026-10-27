import assert from 'node:assert/strict'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path'
import process from 'node:process'
import { fileURLToPath, pathToFileURL } from 'node:url'

// 传入 pnpm pack 产物解压后的 package 目录 , 检查真正交付给使用者的文件
const [packageArg] = process.argv.slice(2)
assert.ok(packageArg, '需要解压后的 package 目录')
const packageDir = resolve(packageArg)
const pkg = JSON.parse(readFileSync(resolve(packageDir, 'package.json'), 'utf8'))
// @quiteer/electron-* 模块包的源码目录为 packages/electron-*
const isModule = /^@quiteer\/electron-[a-z]+$/.test(pkg.name)
assert.ok(isModule || ['electronup', 'create-electronup'].includes(pkg.name), '未知发布包')
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const sourcePath = resolve(repoRoot, 'packages', pkg.name.replace(/^@quiteer\//, ''), 'package.json')
const source = JSON.parse(readFileSync(sourcePath, 'utf8'))
assert.equal(pkg.name, source.name, '发布包名称与源码不一致')
assert.equal(pkg.version, source.version, '发布包版本与源码不一致')
assert.equal(pkg.engines?.node, source.engines?.node, '发布包 Node 要求与源码不一致')

function assertFile(entry) {
  const target = resolve(packageDir, entry)
  const rel = relative(packageDir, target)
  assert.ok(!isAbsolute(rel) && rel !== '..' && !rel.startsWith(`..${sep}`), `入口越出包目录 : ${entry}`)
  assert.ok(statSync(target).isFile(), `入口文件不存在 : ${entry}`)
}

function checkExports(value) {
  if (typeof value === 'string') { assertFile(value) }
  else if (value && typeof value === 'object') {
    for (const entry of Object.values(value)) { checkExports(entry) }
  }
}

for (const entry of ['LICENSE', 'README.md', pkg.main, pkg.module, pkg.types].filter(Boolean))
  {assertFile(entry)}
checkExports(pkg.exports)
if (!isModule) {
  assert.ok(pkg.bin?.[pkg.name], '缺少 CLI bin 入口')
  for (const entry of Object.values(pkg.bin)) {
    assertFile(entry)
    assert.ok(readFileSync(resolve(packageDir, entry), 'utf8').startsWith('#!/usr/bin/env node'), 'CLI 必须带 Node shebang')
  }
}

for (const group of ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']) {
  for (const [name, specifier] of Object.entries(pkg[group] ?? {}))
    {assert.ok(!/^(?:catalog:|workspace:|link:|file:)/.test(specifier), `发布包包含本地依赖 : ${name}=${specifier}`)}
}

for (const entry of readdirSync(packageDir)) {
  const allowed = ['dist', 'LICENSE', 'README.md', 'package.json']
  if (pkg.name === 'create-electronup') { allowed.push('index.js') }
  // 模块包附带 CHANGELOG , 部分包另有 files 声明的入口 ( 如 preload 的 index.cjs 、ipc 的 web/ )
  if (isModule) { allowed.push(...source.files) }
  assert.ok(allowed.includes(entry), `发布包包含非预期文件 : ${entry}`)
}

if (pkg.name === 'electronup') {
  const requireFromSource = createRequire(sourcePath)
  const vitePlus = requireFromSource('vite-plus/package.json')
  assert.equal(pkg.engines.node, vitePlus.engines.node, 'Node 支持范围需要与 vite-plus 一起核对')
  assert.equal(pkg.bin.electronup, './dist/bin/electronup.mjs')
  assert.equal(pkg.dependencies?.electron, undefined, 'electron 不应进入运行依赖')
  assert.equal(pkg.peerDependenciesMeta?.electron?.optional, true)

  // 不安装或启动 Electron , 直接验证 ESM 与 CJS 入口不会初始化更新器
  const esm = await import(pathToFileURL(resolve(packageDir, pkg.exports['.'].import)).href)
  const cjs = createRequire(resolve(packageDir, 'package.json'))('electronup')
  for (const api of [esm, cjs]) {
    const config = { resourceDir: 'dist/resource' }
    assert.equal(api.defineConfig(config), config)
    assert.equal(typeof api.initAutoUpdater, 'function')
    assert.equal(typeof api.checkForUpdates, 'function')
    assert.equal(typeof api.autoUpdater, 'object')
  }
}
else if (isModule) {
  // 模块包运行期依赖 electron , 这里不导入入口 , 只核对 electron 留在 peer 依赖里
  assert.equal(pkg.dependencies?.electron, undefined, 'electron 不应进入运行依赖')
  assert.ok(pkg.peerDependencies?.electron, '模块包需要声明 electron peer 依赖')
  assertFile('CHANGELOG.md')
}
else {
  assertFile('dist/index.mjs')
}
