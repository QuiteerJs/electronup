import { beforeEach, describe, expect, it, vi } from 'vitest'

// 通过 mock createRequire 注入假的 electron / electron-updater ,
// 从而在普通 Node 单测里验证 autoUpdater 惰性代理的 trap 行为
const { fakeApp, fakeUpdater, loadModule } = await vi.hoisted(async () => {
  const { EventEmitter } = await import('node:events')
  const fakeApp = { isPackaged: true }
  const options: { autoDownload: boolean, autoInstallOnAppQuit: boolean, logger: unknown } = {
    autoDownload: true,
    autoInstallOnAppQuit: true,
    logger: undefined,
  }
  const fakeUpdater = Object.assign(new EventEmitter(), options, {
    checkForUpdates: vi.fn<() => Promise<unknown>>(),
  })
  const loadModule = vi.fn((id: string) => {
    if (id === 'electron')
      {return { app: fakeApp }}
    if (id === 'electron-updater')
      {return { autoUpdater: fakeUpdater }}
    throw new Error(`unexpected require: ${id}`)
  })
  return { fakeApp, fakeUpdater, loadModule }
})

vi.mock('node:module', () => ({ createRequire: () => loadModule }))

const updater = await import('./updater')

beforeEach(() => {
  loadModule.mockClear()
  fakeApp.isPackaged = true
  fakeUpdater.autoDownload = true
  fakeUpdater.autoInstallOnAppQuit = true
  fakeUpdater.logger = undefined
  fakeUpdater.checkForUpdates.mockReset().mockResolvedValue(null)
  fakeUpdater.removeAllListeners()
})

describe('autoUpdater 惰性代理 trap', () => {
  it('get : 读取属性转发到真实实例', () => {
    expect(updater.autoUpdater.autoDownload).toBe(true)
  })

  it('set : 赋值转发到真实实例', () => {
    updater.autoUpdater.autoDownload = false
    expect(fakeUpdater.autoDownload).toBe(false)
  })

  it('has : in 运算符可用', () => {
    expect('autoDownload' in updater.autoUpdater).toBe(true)
    expect('notExists' in updater.autoUpdater).toBe(false)
  })

  it('ownKeys + getOwnPropertyDescriptor : Object.keys 与对象拷贝可用', () => {
    expect(Object.keys(updater.autoUpdater)).toContain('autoDownload')
    expect(Object.assign({}, updater.autoUpdater).autoDownload).toBe(true)
  })

  it('事件订阅、解绑与 once 作用于同一个真实实例', () => {
    const listener = vi.fn()
    const once = vi.fn()
    const info = { version: '2.0.0' }
    updater.autoUpdater.on('update-available', listener)
    updater.autoUpdater.once('update-available', once)

    fakeUpdater.emit('update-available', info)
    updater.autoUpdater.off('update-available', listener)
    fakeUpdater.emit('update-available', info)

    expect(listener).toHaveBeenCalledExactlyOnceWith(info)
    expect(once).toHaveBeenCalledExactlyOnceWith(info)
    expect(fakeUpdater.listenerCount('update-available')).toBe(0)
  })
})

describe('更新器初始化与检查', () => {
  it('initAutoUpdater 返回真实实例并应用参数', () => {
    const result = updater.initAutoUpdater({
      checkOnStart: false,
      autoDownload: false,
      autoInstallOnAppQuit: false,
    })
    expect(result).toBe(fakeUpdater)
    expect(fakeUpdater.autoDownload).toBe(false)
    expect(fakeUpdater.autoInstallOnAppQuit).toBe(false)
    expect(fakeUpdater.checkForUpdates).not.toHaveBeenCalled()
  })

  it('默认启用下载、退出安装并发起一次启动检查', () => {
    fakeUpdater.autoDownload = false
    fakeUpdater.autoInstallOnAppQuit = false

    updater.initAutoUpdater()

    expect(fakeUpdater.autoDownload).toBe(true)
    expect(fakeUpdater.autoInstallOnAppQuit).toBe(true)
    expect(fakeUpdater.checkForUpdates).toHaveBeenCalledExactlyOnceWith()
  })

  it('开发环境初始化只应用配置 , 不检查更新', () => {
    fakeApp.isPackaged = false
    const result = updater.initAutoUpdater({ autoDownload: false })

    expect(result).toBe(fakeUpdater)
    expect(fakeUpdater.autoDownload).toBe(false)
    expect(fakeUpdater.checkForUpdates).not.toHaveBeenCalled()
  })

  it('开发环境手动检查返回 null , 不加载更新器', async () => {
    fakeApp.isPackaged = false

    await expect(updater.checkForUpdates()).resolves.toBeNull()

    expect(loadModule).not.toHaveBeenCalledWith('electron-updater')
    expect(fakeUpdater.checkForUpdates).not.toHaveBeenCalled()
  })

  it('省略 logger 时保留已有配置 , 也支持显式设置与清空', () => {
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
    fakeUpdater.logger = logger
    updater.initAutoUpdater({ checkOnStart: false })
    expect(fakeUpdater.logger).toBe(logger)

    updater.initAutoUpdater({ checkOnStart: false, logger: null })
    expect(fakeUpdater.logger).toBeNull()

    updater.initAutoUpdater({ checkOnStart: false, logger })
    expect(fakeUpdater.logger).toBe(logger)
  })

  it('启动检查拒绝时被处理 , error 事件仍可订阅', async () => {
    const error = new Error('更新源不可用')
    const listener = vi.fn()
    updater.autoUpdater.on('error', listener)
    fakeUpdater.checkForUpdates.mockImplementation(async () => {
      fakeUpdater.emit('error', error)
      throw error
    })

    expect(updater.initAutoUpdater()).toBe(fakeUpdater)
    await Promise.resolve()

    expect(listener).toHaveBeenCalledExactlyOnceWith(error)
    expect(fakeUpdater.checkForUpdates).toHaveBeenCalledOnce()
  })

  it('手动检查透传更新结果与 Promise', async () => {
    const result = { updateInfo: { version: '2.0.0' } }
    const pending = Promise.resolve(result)
    fakeUpdater.checkForUpdates.mockReturnValue(pending)

    expect(updater.checkForUpdates()).toBe(pending)
    await expect(pending).resolves.toBe(result)
    expect(fakeUpdater.checkForUpdates).toHaveBeenCalledExactlyOnceWith()
  })

  it('手动检查将原始错误交给调用方', async () => {
    const error = new Error('更新源不可用')
    fakeUpdater.checkForUpdates.mockRejectedValue(error)

    await expect(updater.checkForUpdates()).rejects.toBe(error)
  })
})
