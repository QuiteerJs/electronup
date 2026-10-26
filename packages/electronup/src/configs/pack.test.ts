import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import type { InlineConfig } from 'vite'
import { assertMainEntry, createExternal, getElectronBinary, getPackConfig, globalProcessPlugin, injectEnv, removeJunk } from './pack'
import { store, DefaultDirs } from '../utils'

vi.spyOn(process, 'cwd').mockReturnValue('/fake/root')

// vitest 的模块运行器会从工作区解析 electron , 用 mock 模拟“项目中未安装 electron”
const requireMock = vi.hoisted(() => vi.fn())
vi.mock('node:module', async (importOriginal) => {
  const { isBuiltin } = await importOriginal<typeof import('node:module')>()
  return { isBuiltin, createRequire: () => requireMock }
})

describe('removeJunk (Electron 输出过滤)', () => {
  let info: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    info = vi.spyOn(console, 'info').mockImplementation(() => {})
  })

  afterEach(() => {
    info.mockRestore()
  })

  it('child_process data 事件传入的 Buffer 不会抛 chunk.split is not a function', () => {
    expect(() => removeJunk(Buffer.from('hello from electron\n'))).not.toThrow()
    expect(info).toHaveBeenCalledOnce()
  })

  it('字符串输入同样可用', () => {
    expect(() => removeJunk('hello from electron\n')).not.toThrow()
    expect(info).toHaveBeenCalledOnce()
  })

  it('过滤带时间戳的 Electron( Helper ) 噪音日志 ( Buffer 输入 )', () => {
    removeJunk(Buffer.from('2024-05-01 12:00:00.123 Electron[1234:1] noise\n'))
    removeJunk(Buffer.from('2024-05-01 12:00:00.123 Electron Helper[1234:1] noise\n'))
    expect(info).not.toHaveBeenCalled()
  })

  it('过滤 ERROR:CONSOLE 日志 ( Buffer 输入 )', () => {
    removeJunk(Buffer.from('[1234:0501/120000.123:ERROR:CONSOLE(42)] noise\n'))
    expect(info).not.toHaveBeenCalled()
  })

  it('过滤 ALSA lib 噪音日志 ( Buffer 输入 )', () => {
    removeJunk(Buffer.from('ALSA lib pcm.c:2664:(snd_pcm_open_noupdate) noise\n'))
    expect(info).not.toHaveBeenCalled()
  })
})

describe('pack dotenv 降级', () => {
  beforeEach(() => {
    store.mode = 'development'
    store.command = 'serve'
    store.port = 8090
  })

  it('.env 不存在时 injectEnv 不崩溃', () => {
    const env = injectEnv() as Record<string, string>
    expect(env.NODE_ENV).toBe('development')
    expect(env.RENDER_PORT).toBe('8090')
  })

  it('build 模式下 NODE_ENV 为 production', () => {
    store.command = 'build'
    const env = injectEnv() as Record<string, string>
    expect(env.NODE_ENV).toBe('production')
    expect(env.RENDER_PORT).toBeUndefined()
  })
})

const output = (cfg: InlineConfig) => cfg.build?.rolldownOptions?.output as { format: string, entryFileNames: string }
const external = (cfg: InlineConfig) => cfg.build?.rolldownOptions?.external as (id: string, importer: string | undefined, isResolved: boolean) => boolean

describe('getPackConfig', () => {
  beforeEach(() => {
    store.minify = false
    store.command = 'serve'
    store.mode = 'development'
    store.port = 8090
  })

  it('使用 Vite SSR 构建 , 固定输出 resourceDir/electron.cjs', () => {
    const cfg = getPackConfig({}, { resourceDir: 'out/res' })
    expect(cfg.configFile).toBe(false)
    expect(cfg.envDir).toBe(false)
    expect(cfg.publicDir).toBe(false)
    expect(cfg.ssr).toEqual({ target: 'node', noExternal: true })
    expect(cfg.build?.ssr).toBe(true)
    expect(cfg.build?.emptyOutDir).toBe(false)
    expect(cfg.build?.outDir).toMatch(/out[\\/]res$/)
    expect(output(cfg)).toMatchObject({ format: 'cjs', entryFileNames: '[name].cjs' })
  })

  it('watch 在 serve 模式下开启 , 并挂载启动 Electron 的插件', () => {
    store.command = 'serve'
    const cfg = getPackConfig({}, {})
    expect(cfg.build?.watch).toEqual({})
    expect(cfg.plugins).toContainEqual(expect.objectContaining({ name: 'electronup:start-electron' }))
  })

  it('watch 在 build 模式下关闭 , 不启动 Electron', () => {
    store.command = 'build'
    const cfg = getPackConfig({}, {})
    expect(cfg.build?.watch).toBeNull()
    expect(cfg.plugins).not.toContainEqual(expect.objectContaining({ name: 'electronup:start-electron' }))
  })

  it('minify 跟随 store.minify', () => {
    store.command = 'build'
    store.minify = true
    expect(getPackConfig({}, {}).build?.minify).toBe(true)

    store.minify = false
    expect(getPackConfig({}, {}).build?.minify).toBe(false)
  })

  it('minify 显式 false 时关闭', () => {
    store.minify = false
    store.command = 'serve'
    expect(getPackConfig({}, {}).build?.minify).toBe(false)
  })

  it('env 注入为 process.env.X 与 import.meta.env.X 的 define', () => {
    store.command = 'build'
    const cfg = getPackConfig({}, {})
    expect(cfg.define).toMatchObject({
      'process.env.NODE_ENV': '"production"',
      'import.meta.env.NODE_ENV': '"production"',
    })
  })

  it('entry 指向 mainDir/index.ts', () => {
    const cfg = getPackConfig({}, { mainDir: 'src/main' })
    expect(cfg.build?.rolldownOptions?.input).toMatchObject({ electron: expect.stringMatching(/src[\\/]main[\\/]index\.ts$/) })
  })

  it('未指定 mainDir 时使用 DefaultDirs.mainDir', () => {
    const cfg = getPackConfig({}, {})
    expect(cfg.build?.rolldownOptions?.input).toMatchObject({
      electron: expect.stringMatching(new RegExp(`${DefaultDirs.mainDir}[\\\\/]index\\.ts$`)),
    })
  })

  it('packConfig.external / noExternal 传给 external 判断', () => {
    const isExternal = external(getPackConfig({ external: ['foo'], noExternal: ['electronup'] }, {}))
    expect(isExternal('foo', undefined, false)).toBe(true)
    expect(isExternal('foo/sub', undefined, false)).toBe(true)
    expect(isExternal('electronup', undefined, false)).toBe(false)
  })
})

describe('createExternal ( 依赖是否打包 )', () => {
  let dir: string

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'electronup-external-'))
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({
      dependencies: { 'dep': '1', '@scope/dep': '1', 'electronup': '1' },
      peerDependencies: { peer: '1' },
      optionalDependencies: { optional: '1' },
      devDependencies: { dev: '1' },
    }))
  })

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true })
  })

  it('electron、Node 内置模块与运行时依赖不打包 , devDependencies 与未声明的模块打包', () => {
    const isExternal = createExternal({}, dir)
    for (const id of ['electron', 'electron/main', 'node:fs', 'fs', 'dep', 'dep/sub', '@scope/dep/sub', 'peer', 'optional'])
      {expect(isExternal(id, undefined, false), id).toBe(true)}
    for (const id of ['dev', 'unknown', '@scope/other', './local', '/abs/file.ts', '\0virtual'])
      {expect(isExternal(id, undefined, false), id).toBe(false)}
    expect(isExternal('dep', undefined, true)).toBe(false)
  })

  it('noExternal 让运行时依赖打包 , external 优先于 noExternal , electron 始终不打包', () => {
    const isExternal = createExternal({ external: [/^unk/, 'electronup'], noExternal: ['dep', /^@scope\//, 'electronup'] }, dir)
    expect(isExternal('dep', undefined, false)).toBe(false)
    expect(isExternal('@scope/dep', undefined, false)).toBe(false)
    expect(isExternal('unknown', undefined, false)).toBe(true)
    expect(isExternal('electronup', undefined, false)).toBe(true)

    const bundleAll = createExternal({ noExternal: true }, dir)
    expect(bundleAll('dep', undefined, false)).toBe(false)
    expect(bundleAll('electron', undefined, false)).toBe(true)
    expect(bundleAll('node:path', undefined, false)).toBe(true)
  })

  it('没有 package.json 时只排除 electron 与内置模块', () => {
    const isExternal = createExternal({}, path.join(dir, 'missing'))
    expect(isExternal('dep', undefined, false)).toBe(false)
    expect(isExternal('electron', undefined, false)).toBe(true)
  })
})

describe('globalProcessPlugin ( import process 时 env 仍可内联 )', () => {
  const plugin = globalProcessPlugin()
  const transform = (code: string, id: string) => plugin.transform(code, id)

  it('去掉 node:process / process 的默认导入 , 且不改变代码位置', () => {
    const code = `import process from 'node:process'\nimport process from "process";\nconsole.log(process.env.NODE_ENV)\n`
    const result = transform(code, '/src/main/index.ts')!
    expect(result.code).not.toMatch(/import\s+process/)
    expect(result.code).toContain('console.log(process.env.NODE_ENV)')
    expect(result.code.length).toBe(code.length)
    expect(result.code.split('\n')).toHaveLength(code.split('\n').length)
  })

  it('不处理 node_modules、非脚本文件与其他导入形式', () => {
    const code = `import process from 'node:process'\n`
    expect(transform(code, '/proj/node_modules/foo/index.js')).toBeNull()
    expect(transform(code, '/src/style.css')).toBeNull()
    expect(transform(`import { env } from 'node:process'\n`, '/src/main/index.ts')).toBeNull()
    expect(transform(`import processLike from 'node:process'\n`, '/src/main/index.ts')).toBeNull()
  })

  it('主进程配置默认挂载该插件', () => {
    store.command = 'build'
    const cfg = getPackConfig({}, {})
    expect(cfg.plugins).toEqual([expect.objectContaining({ name: 'electronup:global-process' })])
  })
})

describe('dev 预检', () => {
  let dir: string

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'electronup-pack-'))
    vi.spyOn(process, 'cwd').mockReturnValue(dir)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    fs.rmSync(dir, { recursive: true, force: true })
  })

  it('项目中没有 electron 时给出安装提示 , electron 下载不完整时透出原因', () => {
    requireMock.mockImplementationOnce(() => {
      throw Object.assign(new Error("Cannot find module 'electron'"), { code: 'MODULE_NOT_FOUND' })
    })
    expect(() => getElectronBinary()).toThrow('未在项目中找到 electron , 请先安装')

    requireMock.mockImplementationOnce(() => {
      throw new Error('Electron failed to install correctly')
    })
    expect(() => getElectronBinary()).toThrow('electron 无法使用 : Electron failed to install correctly')

    requireMock.mockReturnValueOnce('/bin/electron')
    expect(getElectronBinary()).toBe('/bin/electron')
  })

  it('主进程入口不存在时报错 , 存在时通过', () => {
    expect(() => assertMainEntry({ mainDir: 'src/main' })).toThrow(path.join(dir, 'src', 'main', 'index.ts'))
    fs.mkdirSync(path.join(dir, 'main'))
    fs.writeFileSync(path.join(dir, 'main', 'index.ts'), '')
    expect(() => assertMainEntry({})).not.toThrow()
  })
})
