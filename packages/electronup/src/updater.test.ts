import { describe, expect, it, vi } from 'vitest'
import * as updater from './updater'

const { loadModule } = vi.hoisted(() => ({
  loadModule: vi.fn((id: string) => {
    throw new Error(`不应在导入阶段加载 ${id}`)
  }),
}))

vi.mock('node:module', () => ({ createRequire: () => loadModule }))

describe('updater 惰性加载', () => {
  it('普通 Node 进程导入模块不触发 electron / electron-updater 副作用', () => {
    // 模块加载阶段不能 require electron / electron-updater ( 否则配置文件在 Node 中加载即崩溃 )
    expect(Object.keys(updater)).toHaveLength(3)
    expect(Object.keys(updater)).toEqual(expect.arrayContaining(['autoUpdater', 'checkForUpdates', 'initAutoUpdater']))
    expect(typeof updater.initAutoUpdater).toBe('function')
    expect(typeof updater.checkForUpdates).toBe('function')
    expect(typeof updater.autoUpdater).toBe('object')
    expect(loadModule).not.toHaveBeenCalled()
  })

  it('只有读取代理属性时才实例化 electron-updater ( 即在 Electron 运行期才需要 )', () => {
    // 明确断言加载边界 , 不依赖本机 Electron 是否安装或第三方包的报错方式
    expect(() => updater.autoUpdater.autoDownload).toThrow('不应在导入阶段加载 electron-updater')
    expect(loadModule).toHaveBeenCalledExactlyOnceWith('electron-updater')
  })
})
