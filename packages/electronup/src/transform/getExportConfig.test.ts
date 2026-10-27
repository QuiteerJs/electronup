import { describe, expect, it, vi } from 'vitest'
import { resolveElectronupConfig } from './getExportConfig'

vi.mock('../configs/electronup', () => ({ getElectronupConfig: vi.fn() }))
vi.mock('../utils', () => ({ store: { command: 'build', mode: 'staging', root: '/proj' } }))

describe('resolveElectronupConfig', () => {
  it('对象导出原样返回', async () => {
    const config = { resourceDir: 'custom-out' }
    expect(await resolveElectronupConfig(config)).toBe(config)
  })

  it('函数导出会被执行并收到 ConfigEnv , 清理前即可读到真实 resourceDir', async () => {
    const fn = vi.fn(() => ({ resourceDir: 'custom-out' }))
    expect(await resolveElectronupConfig(fn)).toEqual({ resourceDir: 'custom-out' })
    expect(fn).toHaveBeenCalledWith({ command: 'build', mode: 'staging', root: '/proj' })
  })

  it('异步函数与 Promise 导出', async () => {
    expect(await resolveElectronupConfig(async () => ({ outDir: 'release' }))).toEqual({ outDir: 'release' })
    expect(await resolveElectronupConfig(Promise.resolve({ outDir: 'release' }))).toEqual({ outDir: 'release' })
  })

  it('最终结果不是普通对象时报错', async () => {
    await expect(resolveElectronupConfig(null as any)).rejects.toThrow('配置错误')
    await expect(resolveElectronupConfig((() => 'oops') as any)).rejects.toThrow('配置错误')
    await expect(resolveElectronupConfig((async () => null) as any)).rejects.toThrow('配置错误')
    await expect(resolveElectronupConfig([] as any)).rejects.toThrow('配置错误')
  })
})
