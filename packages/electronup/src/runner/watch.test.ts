import process from 'node:process'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createDevServer } from './watch'

const viteEndListener = vi.fn()

// 模拟 vite : createServer 时注册 stdin 'end' 监听 ( 对应 vite 的 setupSIGTERMListener )
vi.mock('vite', () => ({
  createServer: vi.fn(async () => {
    process.stdin.on('end', viteEndListener)
    return {}
  }),
}))
vi.mock('portfinder', () => ({ getPortPromise: vi.fn() }))
vi.mock('../transform', () => ({ electronupConfig: vi.fn() }))
vi.mock('./clean', () => ({ cleanOutputDirsOrExit: vi.fn() }))

const userListener = () => {}
const isTTY = process.stdin.isTTY

beforeEach(() => {
  process.stdin.on('end', userListener)
})

afterEach(() => {
  process.stdin.off('end', userListener)
  process.stdin.off('end', viteEndListener)
  process.stdin.isTTY = isTTY
})

describe('createDevServer', () => {
  it('stdin 非 TTY 时移除 vite 新增的 end 监听 , 保留已有监听', async () => {
    process.stdin.isTTY = false
    await createDevServer({})
    const listeners = process.stdin.listeners('end')
    expect(listeners).not.toContain(viteEndListener)
    expect(listeners).toContain(userListener)
  })

  it('stdin 为 TTY 时保留 vite 的行为', async () => {
    process.stdin.isTTY = true
    await createDevServer({})
    expect(process.stdin.listeners('end')).toContain(viteEndListener)
  })
})
