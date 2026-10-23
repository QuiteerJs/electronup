import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

// pnpm publish 的最后一道本地检查；版本、提交与标签在准备阶段完成
const pkg = JSON.parse(readFileSync(resolve('package.json'), 'utf8'))
assert.ok(['electronup', 'create-electronup'].includes(pkg.name), '请在待发布包目录执行 pnpm publish')
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim()
const branch = git('branch', '--show-current')
assert.ok(['main', 'master'].includes(branch), `当前分支为 ${branch}，请先将已验收改动合入 main`)
assert.equal(git('status', '--porcelain'), '', '工作区不干净，请先提交本次发布改动并排除本地临时文件')
const tag = `${pkg.name}-v${pkg.version}`
assert.equal(git('rev-list', '-n', '1', tag), git('rev-parse', 'HEAD'), `标签 ${tag} 必须指向当前提交，请先完成发布准备`)
// oxlint-disable-next-line no-console
console.log(`[publish] ${pkg.name}@${pkg.version}，分支与标签检查通过；接下来重新构建发布物`)
