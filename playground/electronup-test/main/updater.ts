import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import process from 'node:process'
import { autoUpdater, initAutoUpdater } from 'electronup'

export function initExampleUpdater() {
  // 先订阅再启动检查 , 保留启动期间的更新事件与错误
  autoUpdater.on('error', error => console.error('检查或下载更新失败 :', error))
  autoUpdater.on('update-available', (info) => {
    // oxlint-disable-next-line no-console
    console.info('发现新版本 :', info.version)
  })
  autoUpdater.on('update-downloaded', (info) => {
    // oxlint-disable-next-line no-console
    console.info('更新已下载 , 退出应用后安装 :', info.version)
  })

  return initAutoUpdater({
    // 构建时设置 ELECTRONUP_UPDATE_URL 后才会生成此文件 ; 开发环境由辅助函数跳过
    checkOnStart: existsSync(resolve(process.resourcesPath, 'app-update.yml')),
    logger: console,
  })
}
