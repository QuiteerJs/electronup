import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { store } from '../utils'
import { build, writeEffectiveConfig } from './build'
import { cleanOutputDirsOrExit } from './clean'

const mocks = vi.hoisted(() => ({ builder: vi.fn() }))

vi.mock('./clean', () => ({ cleanOutputDirsOrExit: vi.fn() }))
vi.mock('../transform', () => ({ electronupConfig: vi.fn(async () => ({ vite: {}, pack: {}, preload: [], builder: {} })) }))
vi.mock('vite', () => ({ build: vi.fn() }))
vi.mock('vite-plus/pack', () => ({ build: vi.fn() }))
vi.mock('electron-builder', async importOriginal => ({
  ...(await importOriginal<typeof import('electron-builder')>()),
  build: mocks.builder,
}))

let root: string

beforeEach(() => {
  root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'electronup-build-')))
  vi.spyOn(process, 'cwd').mockReturnValue(root)
  store.command = 'build'
  store.option = false
  store.web = false
  store.win = true
  store.mac = undefined
  store.linux = undefined
  store.dir = 'dir'
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.clearAllMocks()
  fs.rmSync(root, { recursive: true, force: true })
})

describe('build 输出目录', () => {
  it('builderConfig.directories.output 同时用于清理与 effective config ( 目录不存在时自动创建 )', async () => {
    await build({ builderConfig: { directories: { output: 'release' } } })
    expect(cleanOutputDirsOrExit).toHaveBeenCalledWith(['dist/resource', 'release'])
    expect(fs.existsSync(path.join(root, 'release/electronup-effective-config.yaml'))).toBe(true)
    expect(fs.existsSync(path.join(root, 'dist/out'))).toBe(false)
  })

  it('未配置 directories.output 时使用 outDir', async () => {
    await build({ outDir: 'dist/custom-out' })
    expect(cleanOutputDirsOrExit).toHaveBeenCalledWith(['dist/resource', 'dist/custom-out'])
    expect(fs.existsSync(path.join(root, 'dist/custom-out/electronup-effective-config.yaml'))).toBe(true)
  })

  it('--web 不清理打包输出目录 , 不执行 electron-builder', async () => {
    store.web = true
    await build({ builderConfig: { directories: { output: 'release' } } })
    expect(cleanOutputDirsOrExit).toHaveBeenCalledWith(['dist/resource'])
    expect(mocks.builder).not.toHaveBeenCalled()
  })
})

describe('writeEffectiveConfig', () => {
  it('写入失败只告警 , 不抛错', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    // 目标父路径是文件 , 无法创建目录
    fs.writeFileSync(path.join(root, 'blocker'), '')
    await expect(writeEffectiveConfig(path.join(root, 'blocker/x.yaml'), { a: 1 })).resolves.toBeUndefined()
    expect(error).toHaveBeenCalledOnce()
  })
})
