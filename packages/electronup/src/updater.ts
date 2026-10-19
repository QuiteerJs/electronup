import { app } from 'electron'
import { autoUpdater } from 'electron-updater'

export interface AutoUpdaterOptions {
  /** Whether to check immediately after initialization. Defaults to true. */
  checkOnStart?: boolean
  /** Download updates automatically after they are found. Defaults to true. */
  autoDownload?: boolean
  /** Install a downloaded update when the app quits. Defaults to true. */
  autoInstallOnAppQuit?: boolean
  /** Optional logger compatible with electron-updater's logger. */
  logger?: typeof autoUpdater.logger
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

  autoUpdater.autoDownload = autoDownload
  autoUpdater.autoInstallOnAppQuit = autoInstallOnAppQuit
  if (logger !== undefined)
    {autoUpdater.logger = logger}

  if (checkOnStart && app.isPackaged)
    {void autoUpdater.checkForUpdates().catch(() => undefined)}

  return autoUpdater
}

/** Check for an update and download it according to the configured options. */
export function checkForUpdates() {
  if (!app.isPackaged)
    {return Promise.resolve(null)}
  return autoUpdater.checkForUpdates()
}

export { autoUpdater }
