import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { detectPackageManager, hintPackageManager } from './packageManager'

let sandbox: string

function write(file: string, content = '') {
  const full = path.join(sandbox, file)
  fs.mkdirSync(path.dirname(full), { recursive: true })
  fs.writeFileSync(full, content)
}

beforeEach(() => {
  sandbox = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'electronup-pm-')))
})

afterEach(() => {
  fs.rmSync(sandbox, { recursive: true, force: true })
})

describe('detectPackageManager', () => {
  it('workspace 子项目向上找到根目录的 packageManager 字段', () => {
    write('package.json', JSON.stringify({ packageManager: 'pnpm@10.30.3' }))
    write('pnpm-lock.yaml')
    write('apps/desktop/package.json', JSON.stringify({ name: 'desktop' }))
    expect(detectPackageManager(path.join(sandbox, 'apps/desktop'))).toEqual({ name: 'pnpm', version: '10.30.3', dir: sandbox })
  })

  it('没有 packageManager 字段时按 lockfile 判断 , 最近的目录优先', () => {
    write('yarn.lock')
    write('sub/package.json', '{}')
    write('sub/package-lock.json')
    expect(detectPackageManager(path.join(sandbox, 'sub'))).toMatchObject({ name: 'npm', dir: path.join(sandbox, 'sub') })
    fs.rmSync(path.join(sandbox, 'sub/package-lock.json'))
    expect(detectPackageManager(path.join(sandbox, 'sub'))).toMatchObject({ name: 'yarn', dir: sandbox })
  })

  it('忽略未知的 packageManager 值与损坏的 package.json', () => {
    write('package.json', JSON.stringify({ packageManager: 'deno@2' }))
    write('sub/package.json', '{ broken')
    write('bun.lock')
    expect(detectPackageManager(path.join(sandbox, 'sub'))).toMatchObject({ name: 'bun', dir: sandbox })
  })
})

describe('hintPackageManager', () => {
  it('未经包管理器启动时写入 npm_config_user_agent', () => {
    write('package.json', JSON.stringify({ packageManager: 'pnpm@10.30.3' }))
    const env: NodeJS.ProcessEnv = {}
    hintPackageManager(sandbox, env)
    expect(env.npm_config_user_agent).toBe('pnpm/10.30.3 electronup')
  })

  it('已由包管理器启动时不覆盖', () => {
    write('package.json', JSON.stringify({ packageManager: 'pnpm@10.30.3' }))
    const env: NodeJS.ProcessEnv = { npm_execpath: '/usr/lib/node_modules/npm/bin/npm-cli.js' }
    expect(hintPackageManager(sandbox, env)).toBeUndefined()
    expect(env.npm_config_user_agent).toBeUndefined()
  })
})
