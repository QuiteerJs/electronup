import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { parse } from 'yaml'
import { electronupConfig } from '../transform'
import { store } from '../utils'
import { build } from './build'
import { cleanOutputDirsOrExit } from './clean'
import { resolveBuildTargets } from './targets'

const mocks = vi.hoisted(() => ({ builder: vi.fn(), confirm: vi.fn(), cancel: Symbol('cancel') }))
const CANCEL = mocks.cancel

vi.mock('@clack/prompts', () => ({
  CANCEL_SYMBOL: mocks.cancel,
  intro: vi.fn(),
  note: vi.fn(),
  cancel: vi.fn(),
  outro: vi.fn(),
  confirm: mocks.confirm,
  isCancel: (value: unknown) => value === mocks.cancel,
}))

vi.mock('./clean', () => ({ cleanOutputDirsOrExit: vi.fn() }))
vi.mock('../transform', () => ({ electronupConfig: vi.fn(async () => ({ vite: {}, pack: {}, preload: [], builder: {} })) }))
vi.mock('vite', () => ({ build: vi.fn() }))
vi.mock('./targets', () => ({ resolveBuildTargets: vi.fn(() => new Map()) }))
vi.mock('vite-plus/pack', () => ({ build: vi.fn() }))
vi.mock('electron-builder', async importOriginal => ({
  ...(await importOriginal<typeof import('electron-builder')>()),
  build: mocks.builder,
}))

let root: string

beforeEach(() => {
  root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'electronup-build-')))
  // 预检要求入口存在
  fs.mkdirSync(path.join(root, 'main'))
  fs.writeFileSync(path.join(root, 'main/index.ts'), '')
  fs.writeFileSync(path.join(root, 'a.ts'), '')
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

function mockExit() {
  return vi.spyOn(process, 'exit').mockImplementation(((code: number) => {
    throw new Error(`exit ${code}`)
  }) as never)
}

describe('build 校验失败时不清理、不构建', () => {
  it('目标平台校验失败 : 以 1 退出 , 不清理旧产物', async () => {
    mockExit()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(resolveBuildTargets).mockImplementationOnce(() => {
      throw new Error('构建 macOS 应用需要在 macOS 系统上运行')
    })
    await expect(build({})).rejects.toThrow('exit 1')
    expect(cleanOutputDirsOrExit).not.toHaveBeenCalled()
  })

  it('preload.outDir 位于项目外 : 以 1 退出 , 不清理旧产物', async () => {
    mockExit()
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(build({ preload: { entry: 'a.ts', outDir: '../outside' } })).rejects.toThrow('exit 1')
    expect(error.mock.calls[0][1]).toContain('项目根目录之内')
    expect(cleanOutputDirsOrExit).not.toHaveBeenCalled()
  })

  it('-o 在非 TTY 下以 1 退出 , 不进入向导、不清理', async () => {
    mockExit()
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const isTTY = process.stdin.isTTY
    process.stdin.isTTY = false
    store.option = true
    try {
      await expect(build({})).rejects.toThrow('exit 1')
    }
    finally {
      process.stdin.isTTY = isTTY
    }
    expect(error.mock.calls[0][1]).toContain('TTY')
    expect(cleanOutputDirsOrExit).not.toHaveBeenCalled()
  })
})

describe('入口预检', () => {
  it('主进程入口或 preload entry 缺失时以 1 退出 , 不清理', async () => {
    mockExit()
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(build({ mainDir: 'src/main' })).rejects.toThrow('exit 1')
    expect(error.mock.calls[0][1]).toContain('找不到主进程入口')
    await expect(build({ preload: {} })).rejects.toThrow('exit 1')
    expect(error.mock.calls[1][1]).toContain('preload 缺少 entry')
    await expect(build({ preload: [{ entry: 'a.ts' }, { entry: { p: 'missing.ts' } }] })).rejects.toThrow('exit 1')
    expect(error.mock.calls[2][1]).toContain('preload[1] 的入口文件不存在')
    expect(cleanOutputDirsOrExit).not.toHaveBeenCalled()
  })
})

describe('交互式向导取消时以非 0 退出 , 不清理', () => {
  it('Ctrl+C / Esc 取消 : 130', async () => {
    mockExit()
    const isTTY = process.stdin.isTTY
    process.stdin.isTTY = true
    store.option = true
    mocks.confirm.mockResolvedValueOnce(CANCEL)
    try {
      await expect(build({})).rejects.toThrow('exit 130')
    }
    finally {
      process.stdin.isTTY = isTTY
    }
    expect(cleanOutputDirsOrExit).not.toHaveBeenCalled()
  })
})

describe('effective config', () => {
  it('在 electron-builder 执行前快照 , 不受其原地改写影响', async () => {
    vi.mocked(electronupConfig).mockResolvedValueOnce({ vite: {}, pack: {}, preload: [], builder: { config: { files: ['dist/resource/**/*'] } } })
    mocks.builder.mockImplementationOnce(async (options: any) => {
      options.config.files = [{ filter: ['dist/resource/**/*'] }]
    })
    await build({})
    const text = fs.readFileSync(path.join(root, 'dist/out/electronup-effective-config.yaml'), 'utf8')
    expect(parse(text).builder.config.files).toEqual(['dist/resource/**/*'])
  })

  it('--web 删除上一次打包留下的 effective config', async () => {
    const file = path.join(root, 'dist/out/electronup-effective-config.yaml')
    fs.mkdirSync(path.dirname(file), { recursive: true })
    fs.writeFileSync(file, 'old')
    store.web = true
    await build({})
    expect(fs.existsSync(file)).toBe(false)
  })
})
