import type { UserConfig } from 'vite-plus/pack'
import { describe, expect, it, vi } from 'vitest'
import { getPreloadConfigs, withElectronExternal } from './preload'

vi.spyOn(process, 'cwd').mockReturnValue('/fake/root')

describe('getPreloadConfigs', () => {
  const baseAllConfig = { resourceDir: 'dist/resource' }

  it('preload 为 undefined 时返回空数组', () => {
    expect(getPreloadConfigs(undefined, baseAllConfig)).toEqual([])
  })

  it('preload 为 null 时返回空数组', () => {
    expect(getPreloadConfigs(null as unknown as UserConfig, baseAllConfig)).toEqual([])
  })

  it('preload 为单项配置时归一化为单项数组', () => {
    const result = getPreloadConfigs({ entry: 'preload/index.ts' }, baseAllConfig)
    expect(result).toHaveLength(1)
    expect(result[0].entry).toBe('preload/index.ts')
    expect(result[0].format).toBe('cjs')
    expect(result[0].dts).toBe(false)
    expect(result[0].clean).toBe(false)
    expect(result[0].external).toContain('electron')
    expect(result[0].outDir).toMatch(/dist[\\/]resource$/)
  })

  it('preload 为数组时每项都归一化', () => {
    const result = getPreloadConfigs(
      [
        { entry: 'preload/main.ts' },
        { entry: 'preload/clipboard.ts', format: 'esm' as const },
      ],
      baseAllConfig,
    )
    expect(result).toHaveLength(2)
    // Object.assign: 先默认项 {format:'cjs'}, 再用户 config, 再最后 outDir/env
    // 用户显式 format:'esm' 覆盖了默认 cjs
    expect(result[0].format).toBe('cjs')
    expect(result[1].format).toBe('esm')
    expect(result[1].external).toContain('electron')
    expect(result[1].dts).toBe(false)
    expect(result[1].clean).toBe(false)
  })

  it('用户自定义 outDir 被 resolve 转成绝对路径', () => {
    const result = getPreloadConfigs(
      { entry: 'preload/index.ts', outDir: 'custom/out' },
      baseAllConfig,
    )
    // preload.ts 最后用 resolve(root, config.outDir || ...) 强制处理 outDir
    expect(result[0].outDir).toMatch(/custom[\\/]out$/)
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
})

describe('preload external 始终保留 electron', () => {
  const baseAllConfig = { resourceDir: 'dist/resource' }

  it('external: [] 或自定义数组时仍包含 electron', () => {
    const [empty, custom] = getPreloadConfigs(
      [{ entry: 'a.ts', external: [] }, { entry: 'b.ts', external: ['foo', /^bar/] }],
      baseAllConfig,
    )
    expect(empty.external).toEqual(['electron'])
    expect(custom.external).toEqual(['electron', 'foo', /^bar/])
  })

  it('字符串 / 正则 / 函数形态', () => {
    expect(withElectronExternal('foo')).toEqual(['electron', 'foo'])
    expect(withElectronExternal(/^foo/)).toEqual(['electron', /^foo/])
    const fn = withElectronExternal(id => id === 'foo') as (id: string, parentId: string | undefined, isResolved: boolean) => unknown
    expect(fn('electron', undefined, false)).toBe(true)
    expect(fn('foo', undefined, false)).toBe(true)
    expect(fn('baz', undefined, false)).toBe(false)
  })

  it('用户使用 deps.neverBundle 时合并进 neverBundle , 不再设置 external', () => {
    const [list, all] = getPreloadConfigs(
      [{ entry: 'a.ts', deps: { neverBundle: ['foo'] } }, { entry: 'b.ts', deps: { neverBundle: true } }],
      baseAllConfig,
    )
    expect(list.external).toBeUndefined()
    expect(list.deps?.neverBundle).toEqual(['electron', 'foo'])
    expect(all.external).toBeUndefined()
    expect(all.deps?.neverBundle).toBe(true)
  })
})
