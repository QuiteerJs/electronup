import process from 'node:process'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getConfig } from './getConfig'
import { loadConfigOrExit } from './loadConfig'

vi.mock('./getConfig', () => ({ getConfig: vi.fn() }))
vi.mock('./getExportConfig', () => ({ resolveElectronupConfig: vi.fn(async (config: unknown) => config) }))

function mockExit() {
  return vi.spyOn(process, 'exit').mockImplementation(((code: number) => {
    throw new Error(`exit ${code}`)
  }) as never)
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

describe('loadConfigOrExit', () => {
  it('成功时返回配置', async () => {
    vi.mocked(getConfig).mockResolvedValueOnce({ resourceDir: 'x' })
    expect(await loadConfigOrExit(undefined)).toEqual({ resourceDir: 'x' })
  })

  it('失败时打印简洁错误与原因 , 以 1 退出 , 不打印堆栈', async () => {
    mockExit()
    vi.stubEnv('DEBUG', '')
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(getConfig).mockRejectedValueOnce(new Error('解析失败', { cause: new SyntaxError('Unexpected end of input') }))

    await expect(loadConfigOrExit('broken.ts')).rejects.toThrow('exit 1')
    const output = error.mock.calls.map(args => args.join(' ')).join('\n')
    expect(output).toContain('err:  解析失败')
    expect(output).toContain('原因 :  Unexpected end of input')
    expect(output).not.toContain('    at ')
  })

  it('DEBUG 时打印完整错误对象', async () => {
    mockExit()
    vi.stubEnv('DEBUG', '1')
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const thrown = new Error('boom')
    vi.mocked(getConfig).mockRejectedValueOnce(thrown)

    await expect(loadConfigOrExit(undefined)).rejects.toThrow('exit 1')
    expect(error).toHaveBeenCalledWith(thrown)
  })
})
