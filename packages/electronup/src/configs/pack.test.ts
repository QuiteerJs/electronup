import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import { getPackConfig, injectEnv, removeJunk } from './pack'
import { store, DefaultDirs } from '../utils'

vi.spyOn(process, 'cwd').mockReturnValue('/fake/root')

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

describe('getPackConfig', () => {
  beforeEach(() => {
    store.minify = false
    store.command = 'serve'
    store.mode = 'development'
    store.port = 8090
  })

  it('format 固定为 cjs', () => {
    const cfg = getPackConfig({}, {})
    expect(cfg.format).toBe('cjs')
  })

  it('watch 在 serve 模式下为 true', () => {
    store.command = 'serve'
    const cfg = getPackConfig({}, {})
    expect(cfg.watch).toBe(true)
  })

  it('watch 在 build 模式下为 false', () => {
    store.command = 'build'
    const cfg = getPackConfig({}, {})
    expect(cfg.watch).toBe(false)
  })

  it('minify 跟随 store.minify', () => {
    store.command = 'build'
    store.minify = true
    const a = getPackConfig({}, {})
    expect(a.minify).toBe(true)

    store.minify = false
    const b = getPackConfig({}, {})
    expect(b.minify).toBe(false)
  })

  it('minify 显式 false 时关闭', () => {
    store.minify = false
    store.command = 'serve'
    const cfg = getPackConfig({}, {})
    expect(cfg.minify).toBe(false)
  })

  it('external 默认包含 electron', () => {
    const cfg = getPackConfig({}, {})
    expect(cfg.external).toContain('electron')
  })

  it('用户 external 合并到 electron 之后', () => {
    const cfg = getPackConfig({ external: ['foo'] }, {})
    expect(cfg.external).toContain('electron')
    expect(cfg.external).toContain('foo')
  })

  it('entry 指向 mainDir/index.ts', () => {
    const cfg = getPackConfig({}, { mainDir: 'src/main' })
    expect(cfg.entry).toMatchObject({ electron: expect.stringMatching(/src[\\/]main[\\/]index\.ts$/) })
  })

  it('未指定 mainDir 时使用 DefaultDirs.mainDir', () => {
    const cfg = getPackConfig({}, {})
    expect(cfg.entry).toMatchObject({
      electron: expect.stringMatching(new RegExp(`${DefaultDirs.mainDir}[\\\\/]index\\.ts$`)),
    })
  })
})
