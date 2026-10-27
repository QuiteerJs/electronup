import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'

// 发布前的最后一道检查 ( 本地 pnpm publish 与 Release workflow 共用 ) ; 版本、提交与标签在准备阶段完成
const pkg = JSON.parse(readFileSync(resolve('package.json'), 'utf8'))
// electronup / create-electronup 与 @quiteer/electron-* 模块包 ; 模块包的标签去掉 scope , 如 electron-ipc-v3.2.0
const isModule = /^@quiteer\/electron-[a-z]+$/.test(pkg.name)
assert.ok(isModule || ['electronup', 'create-electronup'].includes(pkg.name), '请在待发布包目录执行 pnpm publish')
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim()
const tag = `${pkg.name.replace(/^@quiteer\//, '')}-v${pkg.version}`

if (process.env.GITHUB_ACTIONS === 'true') {
  // Release workflow 检出的是标签 ( detached HEAD ) : 要求触发的标签与包版本一致 , 且该提交已在 main 上
  assert.equal(process.env.GITHUB_REF_NAME, tag, `触发标签 ${process.env.GITHUB_REF_NAME} 与包版本 ${tag} 不一致`)
  try {
    git('merge-base', '--is-ancestor', 'HEAD', 'origin/main')
  }
  catch {
    assert.fail(`标签 ${tag} 指向的提交不在 main 上，请先合入 main 再打标签`)
  }
}
else {
  const branch = git('branch', '--show-current')
  assert.ok(['main', 'master'].includes(branch), `当前分支为 ${branch}，请先将已验收改动合入 main`)
}

assert.equal(git('status', '--porcelain'), '', '工作区不干净，请先提交本次发布改动并排除本地临时文件')
assert.equal(git('rev-list', '-n', '1', tag), git('rev-parse', 'HEAD'), `标签 ${tag} 必须指向当前提交，请先完成发布准备`)
// oxlint-disable-next-line no-console
console.log(`[publish] ${pkg.name}@${pkg.version}，分支与标签检查通过；接下来重新构建发布物`)
