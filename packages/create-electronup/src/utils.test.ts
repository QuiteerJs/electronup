import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test'
import { emptyDir, formatTargetDir, FRAMEWORKS, isEmpty, isValidPackageName, pkgFromUserAgent, TEMPLATES, toValidPackageName } from './utils'

let sandbox: string

beforeEach(() => {
  sandbox = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'create-electronup-utils-')))
})

afterEach(() => {
  fs.rmSync(sandbox, { recursive: true, force: true })
})

describe('TEMPLATES', () => {
  it('与 electronup-template 仓库分支一一对应', () => {
    expect(TEMPLATES).toEqual(['vanilla', 'vue', 'react', 'react-swc', 'solid'])
  })

  it('框架名不重复', () => {
    const names = FRAMEWORKS.map(f => f.name)
    expect(new Set(names).size).toBe(names.length)
  })
})

describe('formatTargetDir', () => {
  it('去掉首尾空白与末尾斜杠', () => {
    expect(formatTargetDir('  my-app//  ')).toBe('my-app')
    expect(formatTargetDir('nested/app/')).toBe('nested/app')
  })

  it('未传入时返回 undefined', () => {
    expect(formatTargetDir(undefined)).toBeUndefined()
  })
})

describe('isEmpty / emptyDir', () => {
  it('只有 .git 的目录视为空目录', () => {
    fs.mkdirSync(path.join(sandbox, '.git'))
    expect(isEmpty(sandbox)).toBe(true)
    fs.writeFileSync(path.join(sandbox, 'a.txt'), 'x')
    expect(isEmpty(sandbox)).toBe(false)
  })

  it('清空目录时保留 .git', () => {
    fs.mkdirSync(path.join(sandbox, '.git'))
    fs.writeFileSync(path.join(sandbox, '.git/HEAD'), 'ref')
    fs.mkdirSync(path.join(sandbox, 'src'))
    fs.writeFileSync(path.join(sandbox, 'src/index.ts'), 'x')
    fs.writeFileSync(path.join(sandbox, 'package.json'), '{}')

    emptyDir(sandbox)

    expect(fs.readdirSync(sandbox)).toEqual(['.git'])
    expect(fs.existsSync(path.join(sandbox, '.git/HEAD'))).toBe(true)
  })

  it('目录不存在时什么都不做', () => {
    expect(() => emptyDir(path.join(sandbox, 'missing'))).not.toThrow()
  })
})

describe('pkgFromUserAgent', () => {
  it('解析包管理器名称与版本', () => {
    expect(pkgFromUserAgent('pnpm/10.30.3 npm/? node/v24.12.0 linux x64'))
      .toEqual({ name: 'pnpm', version: '10.30.3' })
  })

  it('没有 user agent 时返回 undefined', () => {
    expect(pkgFromUserAgent(undefined)).toBeUndefined()
  })
})

describe('isValidPackageName / toValidPackageName', () => {
  it('识别合法包名', () => {
    expect(isValidPackageName('my-app')).toBe(true)
    expect(isValidPackageName('@scope/app')).toBe(true)
    expect(isValidPackageName('My App')).toBe(false)
    expect(isValidPackageName('.hidden')).toBe(false)
  })

  it('规整为合法包名', () => {
    expect(toValidPackageName('My App')).toBe('my-app')
    expect(toValidPackageName('  Foo_Bar!! ')).toBe('foo-bar')
    expect(toValidPackageName('.hidden')).toBe('hidden')
  })

  it('规整后为空时回退默认名', () => {
    expect(toValidPackageName('我的应用')).toBe('electronup-project')
  })
})
