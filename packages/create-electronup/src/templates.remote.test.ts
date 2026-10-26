import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import process from 'node:process'
import degit from 'degit'
import { afterAll, beforeAll, describe, expect, it } from 'vite-plus/test'
import electronupPkg from '../../electronup/package.json'
import { remote, TEMPLATES } from './utils'

// 真实拉取 electronup-template 各分支 , 校验模板与当前 electronup 的约定一致
// 依赖 GitHub 网络 , 默认跳过 ; 通过 CREATE_ELECTRONUP_REMOTE=1 开启
const enabled = process.env.CREATE_ELECTRONUP_REMOTE === '1'

const [major, minor] = electronupPkg.version.split('.')

describe.skipIf(!enabled)('electronup-template 远端模板', () => {
  let sandbox: string

  beforeAll(() => {
    sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'create-electronup-remote-'))
  })

  afterAll(() => {
    fs.rmSync(sandbox, { recursive: true, force: true })
  })

  it.each(TEMPLATES)('%s 分支与 electronup 约定一致', async (template) => {
    const dest = path.join(sandbox, template)
    await degit(`${remote}#${template}`, { cache: false, force: true }).clone(dest)

    const pkg = JSON.parse(fs.readFileSync(path.join(dest, 'package.json'), 'utf8'))
    // 主进程产物为 CJS
    expect(pkg.main).toBe('dist/resource/electron.cjs')
    // electronup 版本线与当前核心包一致
    expect(pkg.devDependencies.electronup).toMatch(new RegExp(`^\\^${major}\\.${minor}\\.`))
    expect(pkg.engines.node).toBe(electronupPkg.engines.node)
    // electron 为模板自己的依赖 , electron-updater 必须随安装包分发
    expect(pkg.devDependencies.electron).toBeTruthy()
    expect(pkg.dependencies['electron-updater']).toBeTruthy()

    const config = fs.readFileSync(path.join(dest, 'electronup.config.ts'), 'utf8')
    expect(config).toContain(`from 'electronup'`)
    expect(config).toContain('defineConfig')
  }, 60_000)
})
