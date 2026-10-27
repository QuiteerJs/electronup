import process from 'node:process'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createDevServer, watchPreload } from './watch'

const viteEndListener = vi.fn()

// 模拟 vite : createServer 时注册 stdin 'end' 监听 ( 对应 vite 的 setupSIGTERMListener )
const viteBuild = vi.hoisted(() => vi.fn())
vi.mock('vite', async importOriginal => ({
  mergeConfig: (await importOriginal<typeof import('vite')>()).mergeConfig,
  build: viteBuild,
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

describe('watchPreload', () => {
  it('追加 preload watch 插件 , 首次写盘后才返回', async () => {
    let plugin: { name: string, writeBundle: () => void } | undefined
    viteBuild.mockImplementationOnce(async (config) => {
      plugin = config.plugins.at(-1)
      return {}
    })

    let settled = false
    const pending = watchPreload({ plugins: [{ name: 'user' }] }).then(() => { settled = true })
    await Promise.resolve()
    expect(plugin?.name).toBe('electronup:preload-watch')
    expect(settled).toBe(false)

    plugin!.writeBundle()
    await pending
    expect(settled).toBe(true)
  })

  it('build 本身抛错时 reject', async () => {
    viteBuild.mockRejectedValueOnce(new Error('bad config'))
    await expect(watchPreload({})).rejects.toThrow('bad config')
  })
})
