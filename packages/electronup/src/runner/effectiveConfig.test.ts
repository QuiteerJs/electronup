import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { Arch, Platform } from 'electron-builder'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { parse } from 'yaml'
import { toPlainConfig, writeEffectiveConfig } from './effectiveConfig'

function onSuccess() {}

describe('toPlainConfig', () => {
  it('targets 输出平台与架构名称', () => {
    const plain = toPlainConfig({ builder: { targets: Platform.WINDOWS.createTarget('dir', Arch.x64, Arch.ia32) } })
    expect(plain.builder.targets).toEqual({ windows: { x64: ['dir'], ia32: ['dir'] } })
  })

  it('plugins 只保留名称 , 支持嵌套数组与假值', () => {
    const plain = toPlainConfig({ vite: { plugins: [{ name: 'vite:vue', api: { options: {} } }, [{ name: 'nested' }], false, null] } })
    expect(plain.vite.plugins).toEqual(['vite:vue', 'nested'])
  })

  it('函数 / RegExp / Map / undefined / 循环引用 / 共享引用', () => {
    const shared = { a: 1 }
    const circular: Record<string, unknown> = { name: 'x' }
    circular.self = circular
    const plain = toPlainConfig({
      fn: onSuccess,
      re: /^foo\//g,
      map: new Map([['k', 1]]),
      skip: undefined,
      circular,
      left: shared,
      right: shared,
    })
    expect(plain).toEqual({
      fn: '[Function onSuccess]',
      re: '/^foo\\//g',
      map: { k: 1 },
      circular: { name: 'x', self: '[Circular]' },
      left: { a: 1 },
      right: { a: 1 },
    })
  })

  it('快照与原对象脱钩 , 后续原地修改不影响快照', () => {
    const config = { builder: { config: { files: ['dist/resource/**/*'] } } }
    const plain = toPlainConfig(config)
    config.builder.config.files = [{ filter: ['x'] }] as any
    expect(plain.builder.config.files).toEqual(['dist/resource/**/*'])
  })
})

describe('writeEffectiveConfig', () => {
  let dir: string

  afterEach(() => {
    vi.restoreAllMocks()
    if (dir) { fs.rmSync(dir, { recursive: true, force: true }) }
  })

  it('写入说明头 , 内容可被解析', async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'electronup-effective-'))
    const file = path.join(dir, 'nested/out.yaml')
    await writeEffectiveConfig(file, { a: 1 })
    const text = fs.readFileSync(file, 'utf8')
    expect(text).toMatch(/^# electronup \d+\.\d+\.\d+/)
    expect(text).toContain('并非完整的运行时配置')
    expect(parse(text)).toEqual({ a: 1 })
  })

  it('写入失败只告警 , 不抛错', async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'electronup-effective-'))
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    // 目标父路径是文件 , 无法创建目录
    fs.writeFileSync(path.join(dir, 'blocker'), '')
    await expect(writeEffectiveConfig(path.join(dir, 'blocker/x.yaml'), { a: 1 })).resolves.toBeUndefined()
    expect(error).toHaveBeenCalledOnce()
  })
})
