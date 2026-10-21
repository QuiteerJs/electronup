import { describe, expect, it, vi } from 'vitest'

// 通过 mock createRequire 注入假的 electron / electron-updater ,
// 从而在普通 Node 单测里验证 autoUpdater 惰性代理的 trap 行为
const { fakeApp, fakeUpdater } = vi.hoisted(() => ({
  fakeApp: { isPackaged: true },
  fakeUpdater: {
    autoDownload: true,
    autoInstallOnAppQuit: true,
    checkForUpdates: (): Promise<unknown> => Promise.resolve(null),
  },
}))

vi.mock('node:module', () => ({
  createRequire: () => (id: string) => {
    if (id === 'electron')
      {return { app: fakeApp }}
    if (id === 'electron-updater')
      {return { autoUpdater: fakeUpdater }}
    throw new Error(`unexpected require: ${id}`)
  },
}))

const updater = await import('./updater')

describe('autoUpdater 惰性代理 trap', () => {
  it('get : 读取属性转发到真实实例', () => {
    expect(updater.autoUpdater.autoDownload).toBe(true)
  })

  it('set : 赋值转发到真实实例', () => {
    updater.autoUpdater.autoDownload = false
    expect(fakeUpdater.autoDownload).toBe(false)
    updater.autoUpdater.autoDownload = true
  })

  it('has : in 运算符可用', () => {
    expect('autoDownload' in updater.autoUpdater).toBe(true)
    expect('notExists' in updater.autoUpdater).toBe(false)
  })

  it('ownKeys + getOwnPropertyDescriptor : Object.keys 与对象拷贝可用', () => {
    expect(Object.keys(updater.autoUpdater)).toContain('autoDownload')
    expect(Object.assign({}, updater.autoUpdater).autoDownload).toBe(true)
  })

  it('initAutoUpdater 返回真实实例并应用参数', () => {
    const result = updater.initAutoUpdater({
      checkOnStart: false,
      autoDownload: false,
      autoInstallOnAppQuit: false,
    })
    expect(result).toBe(fakeUpdater)
    expect(fakeUpdater.autoDownload).toBe(false)
    expect(fakeUpdater.autoInstallOnAppQuit).toBe(false)
  })

  it('checkForUpdates 在 packaged 时通过代理调用真实实现', async () => {
    await expect(updater.checkForUpdates()).resolves.toBeNull()
  })
})
