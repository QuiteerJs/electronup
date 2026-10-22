import path from 'node:path'
import process from 'node:process'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanDirs } from '../utils'
import { cleanOutputDirsOrExit } from './clean'

const root = path.resolve('/proj')

vi.mock('../utils', () => ({ cleanDirs: vi.fn(), store: { root: path.resolve('/proj') } }))

afterEach(() => {
  vi.restoreAllMocks()
})

describe('cleanOutputDirsOrExit', () => {
  it('清空后逐个打印目录 ( 项目内用相对路径 , 项目外用绝对路径 )', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})
    const outside = path.resolve('/elsewhere/out')
    vi.mocked(cleanDirs).mockReturnValueOnce([path.join(root, 'dist/resource'), outside])

    cleanOutputDirsOrExit(['dist/resource', outside])
    const lines = info.mock.calls.map(args => String(args[0]))
    expect(lines[0]).toContain(`已清空 ${path.join('dist', 'resource')}`)
    expect(lines[1]).toContain(`已清空 ${outside}`)
  })

  it('校验失败时打印原因并以 1 退出 , 不打印清空日志', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.spyOn(process, 'exit').mockImplementation(((code: number) => {
      throw new Error(`exit ${code}`)
    }) as never)
    vi.mocked(cleanDirs).mockImplementationOnce(() => {
      throw new Error('拒绝清理目录')
    })

    expect(() => cleanOutputDirsOrExit(['.'])).toThrow('exit 1')
    expect(info).not.toHaveBeenCalled()
  })
})
