import type { App } from 'electron'
import type { AppUpdater } from 'electron-updater'
import { createRequire } from 'node:module'

/**
 * 本模块经由 defineConfig 所在的入口被配置加载链引入 , 此时运行在普通 Node 进程 :
 * electron 包只导出可执行文件路径 , electron-updater 的 autoUpdater 是惰性 getter ,
 * 一旦取值就会实例化 updater 并访问 app.getVersion() 而崩溃 ,
 * 因此两者的取值都推迟到真正调用 API 时 ( 即 Electron 主进程运行期 )
 */
const require = createRequire(import.meta.url)

function getApp(): App {
  return (require('electron') as typeof import('electron')).app
}

function getAutoUpdater(): AppUpdater {
  return (require('electron-updater') as typeof import('electron-updater')).autoUpdater
}

export interface AutoUpdaterOptions {
  /** Whether to check immediately after initialization. Defaults to true. */
  checkOnStart?: boolean
  /** Download updates automatically after they are found. Defaults to true. */
  autoDownload?: boolean
  /** Install a downloaded update when the app quits. Defaults to true. */
  autoInstallOnAppQuit?: boolean
  /** Optional logger compatible with electron-updater's logger. */
  logger?: AppUpdater['logger']
}

/**
 * Configure electron-updater for an Electron application.
 * Call this after app.ready (or from app.whenReady()).
 */
export function initAutoUpdater(options: AutoUpdaterOptions = {}) {
  const {
    checkOnStart = true,
    autoDownload = true,
    autoInstallOnAppQuit = true,
    logger,
  } = options

  const updater = getAutoUpdater()

  updater.autoDownload = autoDownload
  updater.autoInstallOnAppQuit = autoInstallOnAppQuit
  if (logger !== undefined)
    {updater.logger = logger}

  if (checkOnStart && getApp().isPackaged)
    {void updater.checkForUpdates().catch(() => undefined)}

  return updater
}

/** Check for an update and download it according to the configured options. */
export function checkForUpdates() {
  if (!getApp().isPackaged)
    {return Promise.resolve(null)}
  return getAutoUpdater().checkForUpdates()
}

/**
 * electron-updater 的原生实例 ( 惰性代理 ) :
 * 只有读取属性时才实例化真实 updater , 保证配置加载阶段不触发 electron 相关副作用
 */
export const autoUpdater: AppUpdater = new Proxy({} as AppUpdater, {
  get: (_target, prop) => Reflect.get(getAutoUpdater(), prop),
  set: (_target, prop, value) => Reflect.set(getAutoUpdater(), prop, value),
  has: (_target, prop) => prop in getAutoUpdater(),
  ownKeys: () => Reflect.ownKeys(getAutoUpdater()),
  getOwnPropertyDescriptor: (_target, prop) => Reflect.getOwnPropertyDescriptor(getAutoUpdater(), prop),
})
