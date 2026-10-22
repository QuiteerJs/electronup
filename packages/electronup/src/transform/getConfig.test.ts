import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getConfig } from './getConfig'

const ctx = vi.hoisted(() => ({ root: '' }))

vi.mock('../utils', () => ({ store: { get root() { return ctx.root } } }))

function write(file: string, content: string) {
  const full = path.join(ctx.root, file)
  fs.mkdirSync(path.dirname(full), { recursive: true })
  fs.writeFileSync(full, content)
  return full
}

const exportMarker = (marker: string) => `export default { resourceDir: '${marker}' }\n`

beforeEach(() => {
  ctx.root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'electronup-config-')))
})

afterEach(() => {
  fs.rmSync(ctx.root, { recursive: true, force: true })
})

describe('getConfig', () => {
  it('未指定路径时按 ts / mjs / cjs / js 顺序查找标准名配置', async () => {
    write('electronup.config.mjs', exportMarker('MJS'))
    expect(await getConfig(undefined)).toEqual({ resourceDir: 'MJS' })

    write('electronup.config.ts', `const dir: string = 'TS'\n${exportMarker('TS').replace('\'TS\'', 'dir')}`)
    expect(await getConfig(undefined)).toEqual({ resourceDir: 'TS' })
  })

  it('找不到标准名配置时报错', async () => {
    await expect(getConfig(undefined)).rejects.toThrow('找不到 electronup.config.ts')
  })

  it('显式相对路径 + 非标准文件名生效 , 不被同目录标准名配置取代', async () => {
    write('alt/electronup.config.mjs', exportMarker('STANDARD'))
    write('alt/custom.mjs', exportMarker('CUSTOM'))
    expect(await getConfig('alt/custom.mjs')).toEqual({ resourceDir: 'CUSTOM' })
  })

  it('显式绝对路径生效', async () => {
    const file = write('alt/abs.config.ts', exportMarker('ABS'))
    expect(await getConfig(file)).toEqual({ resourceDir: 'ABS' })
  })

  it('显式路径不存在时报错 , 不回退到标准名配置', async () => {
    write('electronup.config.mjs', exportMarker('STANDARD'))
    await expect(getConfig('missing.ts')).rejects.toThrow(`找不到指定的配置文件 : ${path.join(ctx.root, 'missing.ts')}`)
  })

  it('显式路径是目录或不支持的类型时报错', async () => {
    write('alt/electronup.config.mjs', exportMarker('STANDARD'))
    await expect(getConfig('alt')).rejects.toThrow('找不到指定的配置文件')
    write('electronup.json', '{}')
    await expect(getConfig('electronup.json')).rejects.toThrow('不支持的配置文件类型')
  })
})
