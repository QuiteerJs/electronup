import type { InlineConfig } from 'vite'
import type { PreloadConfig } from '../typings/electronup'
import { describe, expect, it, vi } from 'vitest'
import { getPreloadConfigs } from './preload'

vi.spyOn(process, 'cwd').mockReturnValue('/fake/root')

const output = (cfg: InlineConfig) => cfg.build?.rolldownOptions?.output as { format: string, entryFileNames: string }
const external = (cfg: InlineConfig) => cfg.build?.rolldownOptions?.external as (id: string, importer: string | undefined, isResolved: boolean) => boolean

describe('getPreloadConfigs', () => {
  const baseAllConfig = { resourceDir: 'dist/resource' }

  it('preload 为 undefined 时返回空数组', () => {
    expect(getPreloadConfigs(undefined, baseAllConfig)).toEqual([])
  })

  it('preload 为 null 时返回空数组', () => {
    expect(getPreloadConfigs(null as unknown as PreloadConfig, baseAllConfig)).toEqual([])
  })

  it('preload 为单项配置时归一化为单项数组 ( Vite SSR 构建 , 默认 cjs )', () => {
    const result = getPreloadConfigs({ entry: 'preload/index.ts' }, baseAllConfig)
    expect(result).toHaveLength(1)
    expect(result[0].build?.ssr).toBe(true)
    expect(result[0].build?.emptyOutDir).toBe(false)
    expect(result[0].build?.rolldownOptions?.input).toBe('preload/index.ts')
    expect(output(result[0])).toMatchObject({ format: 'cjs', entryFileNames: '[name].cjs' })
    expect(result[0].build?.outDir).toMatch(/dist[\\/]resource$/)
    expect(result[0].build?.watch).toBeNull()
  })

  it('preload 为数组时每项都归一化 , format: esm 输出 .mjs', () => {
    const result = getPreloadConfigs(
      [
        { entry: 'preload/main.ts' },
        { entry: 'preload/clipboard.ts', format: 'esm' },
      ],
      baseAllConfig,
    )
    expect(result).toHaveLength(2)
    expect(output(result[0]).format).toBe('cjs')
    expect(output(result[1])).toMatchObject({ format: 'esm', entryFileNames: '[name].mjs' })
  })

  it('用户自定义 outDir 被 resolve 转成绝对路径', () => {
    const result = getPreloadConfigs(
      { entry: 'preload/index.ts', outDir: 'custom/out' },
      baseAllConfig,
    )
    expect(result[0].build?.outDir).toMatch(/custom[\\/]out$/)
  })

  it('默认挂载 globalProcessPlugin , 并保留用户 plugins', () => {
    const userPlugin = { name: 'user-plugin' }
    const [withDefault, withUser] = getPreloadConfigs(
      [{ entry: 'preload/a.ts' }, { entry: 'preload/b.ts', plugins: [userPlugin] }],
      baseAllConfig,
    )
    expect(withDefault.plugins).toEqual([expect.objectContaining({ name: 'electronup:global-process' })])
    expect(withUser.plugins).toEqual([expect.objectContaining({ name: 'electronup:global-process' }), userPlugin])
  })

  it('单项 env 优先于 .env , minify / sourcemap 可单独设置', () => {
    const [cfg] = getPreloadConfigs({ entry: 'a.ts', env: { NODE_ENV: 'custom' }, minify: true, sourcemap: 'inline' }, baseAllConfig)
    expect(cfg.define).toMatchObject({ 'process.env.NODE_ENV': '"custom"' })
    expect(cfg.build?.minify).toBe(true)
    expect(cfg.build?.sourcemap).toBe('inline')
  })

  it('viteConfig 最后合并 , 可覆盖其余 Vite 选项', () => {
    const [cfg] = getPreloadConfigs({ entry: 'a.ts', viteConfig: { build: { target: 'node22' }, resolve: { alias: { '@': '/src' } } } }, baseAllConfig)
    expect(cfg.build?.target).toBe('node22')
    expect(cfg.build?.ssr).toBe(true)
    expect(cfg.resolve?.alias).toEqual({ '@': '/src' })
  })
})

describe('preload external 始终保留 electron', () => {
  const baseAllConfig = { resourceDir: 'dist/resource' }

  it('用户 external 追加在 electron 之后 , noExternal: true 仍不打包 electron', () => {
    const [custom, all] = getPreloadConfigs(
      [{ entry: 'a.ts', external: ['foo', /^bar/] }, { entry: 'b.ts', noExternal: true }],
      baseAllConfig,
    )
    expect(external(custom)('electron', undefined, false)).toBe(true)
    expect(external(custom)('foo', undefined, false)).toBe(true)
    expect(external(custom)('barx', undefined, false)).toBe(true)
    expect(external(custom)('baz', undefined, false)).toBe(false)
    expect(external(all)('electron', undefined, false)).toBe(true)
  })
})
