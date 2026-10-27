import { describe, expect, it, beforeEach, vi } from 'vitest'
import { getViteConfig } from './vite'
import { store, DefaultDirs } from '../utils'

vi.spyOn(process, 'cwd').mockReturnValue('/fake/root')

describe('getViteConfig', () => {
  beforeEach(() => {
    store.minify = false
  })

  it('默认 base 为 ./', () => {
    const cfg = getViteConfig({}, {})
    expect(cfg.base).toBe('./')
  })

  it('minify 跟随 store.minify', () => {
    store.minify = true
    const a = getViteConfig({}, {})
    expect(a.build?.minify).toBe(true)

    store.minify = false
    const b = getViteConfig({}, {})
    expect(b.build?.minify).toBe(false)
  })

  it('renderDir 决定 root', () => {
    const cfg = getViteConfig({}, { renderDir: 'src/render' })
    expect(cfg.root).toMatch(/src[\\/]render$/)
  })

  it('renderDir 未指定时使用 DefaultDirs.render', () => {
    const cfg = getViteConfig({}, {})
    expect(cfg.root).toMatch(new RegExp(`${DefaultDirs.renderDir}$`))
  })

  it('publicDir 跟随 DefaultDirs.publicDir', () => {
    const cfg = getViteConfig({}, {})
    expect(cfg.publicDir).toMatch(new RegExp(`${DefaultDirs.publicDir}$`))
  })

  it('resourceDir 决定 build.outDir', () => {
    const cfg = getViteConfig({}, { resourceDir: 'out/rsc' })
    expect(cfg.build?.outDir).toMatch(/out[\\/]rsc$/)
  })

  it('modulePreload.polyfill 默认关闭', () => {
    const cfg = getViteConfig({}, {})
    expect(cfg.build?.modulePreload).toEqual({ polyfill: false })
  })

  it('用户 build 配置里的 sourcemap 与默认值合并', () => {
    const cfg = getViteConfig(
      { build: { sourcemap: true } },
      {},
    )
    expect(cfg.build?.sourcemap).toBe(true)
  })

  it('mode 跟随 store.mode , envDir 为项目根 ( 读取根目录 .env )', () => {
    store.mode = 'staging'
    const cfg = getViteConfig({}, {})
    expect(cfg.mode).toBe('staging')
    expect(cfg.envDir).toBe(process.cwd())
  })

  it('用户显式配置的 mode / envDir 优先', () => {
    store.mode = 'staging'
    const cfg = getViteConfig({ mode: 'custom', envDir: 'env' }, {})
    expect(cfg.mode).toBe('custom')
    expect(cfg.envDir).toBe('env')
  })
})
