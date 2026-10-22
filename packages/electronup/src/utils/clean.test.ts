import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { assertSafeCleanTarget, cleanDirs, emptyDir } from './clean'

let sandbox: string
let root: string
let home: string

function touch(file: string, content = 'x') {
  fs.mkdirSync(path.dirname(file), { recursive: true })
  fs.writeFileSync(file, content)
}

beforeEach(() => {
  sandbox = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'electronup-clean-')))
  root = path.join(sandbox, 'proj')
  home = path.join(sandbox, 'home')
  fs.mkdirSync(root, { recursive: true })
  fs.mkdirSync(home, { recursive: true })
  touch(path.join(root, 'package.json'), '{}')
})

afterEach(() => {
  vi.restoreAllMocks()
  fs.rmSync(sandbox, { recursive: true, force: true })
})

describe('assertSafeCleanTarget', () => {
  it('接受项目内的普通目录 ( 含尚不存在的目录 )', () => {
    touch(path.join(root, 'dist/resource/a.js'))
    expect(assertSafeCleanTarget('dist/resource', { root, home }))
      .toEqual({ dir: path.join(root, 'dist/resource'), outsideRoot: false })
    expect(assertSafeCleanTarget('dist/not-yet', { root, home }).outsideRoot).toBe(false)
  })

  it('拒绝项目根目录与上级目录', () => {
    expect(() => assertSafeCleanTarget('.', { root, home })).toThrow('项目根目录或其上级目录')
    expect(() => assertSafeCleanTarget('', { root, home })).toThrow('项目根目录或其上级目录')
    expect(() => assertSafeCleanTarget('..', { root, home })).toThrow('项目根目录或其上级目录')
    expect(() => assertSafeCleanTarget('dist/../..', { root, home })).toThrow('项目根目录或其上级目录')
  })

  it('拒绝文件系统根目录', () => {
    expect(() => assertSafeCleanTarget(path.parse(root).root, { root, home })).toThrow()
  })

  it('拒绝用户主目录及其上级', () => {
    expect(() => assertSafeCleanTarget(home, { root, home })).toThrow('用户主目录')
    const outsideHome = path.join(sandbox, 'other', 'home')
    fs.mkdirSync(outsideHome, { recursive: true })
    expect(() => assertSafeCleanTarget(path.dirname(outsideHome), { root, home: outsideHome })).toThrow('用户主目录')
  })

  it('拒绝 node_modules 与 .git 路径', () => {
    expect(() => assertSafeCleanTarget('node_modules/electron', { root, home })).toThrow('node_modules')
    expect(() => assertSafeCleanTarget('node_modules', { root, home })).toThrow('node_modules')
    expect(() => assertSafeCleanTarget('.git', { root, home })).toThrow('.git')
  })

  it('拒绝已存在的文件', () => {
    touch(path.join(root, 'dist/file.txt'))
    expect(() => assertSafeCleanTarget('dist/file.txt', { root, home })).toThrow('不是目录')
  })

  it('拒绝目标本身是符号链接 / junction , 链接指向的内容保持不变', () => {
    const target = path.join(sandbox, 'precious')
    touch(path.join(target, 'KEEP.txt'))
    fs.mkdirSync(path.join(root, 'dist'), { recursive: true })
    fs.symlinkSync(target, path.join(root, 'dist/resource'), 'junction')

    expect(() => cleanDirs(['dist/resource'], { root, home })).toThrow('符号链接')
    expect(fs.existsSync(path.join(target, 'KEEP.txt'))).toBe(true)
  })

  it('上级目录是链接时按真实路径校验', () => {
    // root/up -> 项目上级目录 , 字面路径 root/up/proj 看似在项目内 , 真实路径却是项目根本身
    fs.symlinkSync(sandbox, path.join(root, 'up'), 'junction')
    expect(() => assertSafeCleanTarget('up/proj', { root, home })).toThrow('真实路径')
  })

  it('项目外的目录允许清理 , 但标记 outsideRoot', () => {
    expect(assertSafeCleanTarget('../release', { root, home }))
      .toEqual({ dir: path.join(sandbox, 'release'), outsideRoot: true })
  })
})

describe('emptyDir', () => {
  it('清空目录内容并保留空目录 , 不残留临时目录', () => {
    const dir = path.join(root, 'dist/resource')
    touch(path.join(dir, 'a.js'))
    touch(path.join(dir, 'assets/b.css'))

    emptyDir(dir)

    expect(fs.existsSync(dir)).toBe(true)
    expect(fs.readdirSync(dir)).toEqual([])
    expect(fs.readdirSync(path.join(root, 'dist'))).toEqual(['resource'])
  })

  it('目录不存在时不做任何事', () => {
    const dir = path.join(root, 'dist/none')
    emptyDir(dir)
    expect(fs.existsSync(dir)).toBe(false)
  })

  it('目录内部的链接只删除链接本身 , 不跟随', () => {
    const target = path.join(sandbox, 'shared')
    touch(path.join(target, 'KEEP.txt'))
    const dir = path.join(root, 'dist/resource')
    fs.mkdirSync(dir, { recursive: true })
    fs.symlinkSync(target, path.join(dir, 'link'), 'junction')

    emptyDir(dir)

    expect(fs.readdirSync(dir)).toEqual([])
    expect(fs.existsSync(path.join(target, 'KEEP.txt'))).toBe(true)
  })

  it('目录被占用 ( EBUSY ) 时给出明确错误 , 原有产物不动', () => {
    const dir = path.join(root, 'dist/out')
    touch(path.join(dir, 'app.asar'))
    vi.spyOn(fs, 'renameSync').mockImplementation(() => {
      throw Object.assign(new Error('resource busy or locked'), { code: 'EBUSY' })
    })

    expect(() => emptyDir(dir)).toThrow('正被占用')
    expect(fs.existsSync(path.join(dir, 'app.asar'))).toBe(true)
  })
})

describe('cleanDirs', () => {
  it('任一目标不合法时不删除任何目录', () => {
    const good = path.join(root, 'dist/resource')
    touch(path.join(good, 'OLD.txt'))

    expect(() => cleanDirs(['dist/resource', '.'], { root, home })).toThrow()
    expect(fs.existsSync(path.join(good, 'OLD.txt'))).toBe(true)
    expect(fs.existsSync(path.join(root, 'package.json'))).toBe(true)
  })

  it('全部合法时依次清空并返回绝对路径', () => {
    touch(path.join(root, 'dist/resource/a.js'))
    touch(path.join(root, 'dist/out/b.exe'))

    const dirs = cleanDirs(['dist/resource', 'dist/out'], { root, home })

    expect(dirs).toEqual([path.join(root, 'dist/resource'), path.join(root, 'dist/out')])
    expect(fs.readdirSync(path.join(root, 'dist/resource'))).toEqual([])
    expect(fs.readdirSync(path.join(root, 'dist/out'))).toEqual([])
  })

  it('项目外目录会输出提示', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    cleanDirs(['../release'], { root, home })
    expect(spy).toHaveBeenCalledOnce()
  })
})
