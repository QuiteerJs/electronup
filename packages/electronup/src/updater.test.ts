import { describe, expect, it } from 'vitest'
import * as updater from './updater'

describe('updater 惰性加载', () => {
  it('普通 Node 进程导入模块不触发 electron / electron-updater 副作用', () => {
    // 模块加载阶段不能 require electron / electron-updater ( 否则配置文件在 Node 中加载即崩溃 )
    expect(Object.keys(updater)).toHaveLength(3)
    expect(Object.keys(updater)).toEqual(expect.arrayContaining(['autoUpdater', 'checkForUpdates', 'initAutoUpdater']))
    expect(typeof updater.initAutoUpdater).toBe('function')
    expect(typeof updater.checkForUpdates).toBe('function')
    expect(typeof updater.autoUpdater).toBe('object')
  })

  it('只有读取代理属性时才实例化 electron-updater ( 即在 Electron 运行期才需要 )', () => {
    // 普通 Node 中 require('electron').app 为 undefined , electron-updater 实例化时访问 app.getVersion 会抛错 ;
    // 导入阶段不抛错、读取属性才抛错 , 正是惰性代理要保证的行为
    expect(() => (updater.autoUpdater as { autoDownload?: boolean }).autoDownload).toThrow()
  })
})
