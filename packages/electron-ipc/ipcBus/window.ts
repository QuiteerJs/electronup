import { BrowserWindow } from 'electron'
import { IpcWindowOptions } from '../event-enum/options'

export const ipcBus = new Map<IpcWindowOptions, (event: Electron.IpcMainEvent, state?: any) => void>()

const getWin = (event: Electron.IpcMainEvent) => BrowserWindow.fromWebContents(event.sender)

// 销毁窗口 触发closed事件
ipcBus.set(IpcWindowOptions.DESTROY, event => getWin(event)?.destroy())
// 尝试关闭窗口。 该方法与用户手动单击窗口的关闭按钮效果相同。 但网页可能会取消这个关闭操作。
ipcBus.set(IpcWindowOptions.CLOSE, event => getWin(event)?.close())

// 字面意思
ipcBus.set(IpcWindowOptions.SHOW, event => getWin(event)?.show())
ipcBus.set(IpcWindowOptions.HIDE, event => getWin(event)?.hide())
ipcBus.set(IpcWindowOptions.FOCUS, event => getWin(event)?.focus())
ipcBus.set(IpcWindowOptions.BLUR, event => getWin(event)?.blur())
ipcBus.set(IpcWindowOptions.MAXIMIZE, event => getWin(event)?.maximize())
ipcBus.set(IpcWindowOptions.UNMAXIMIZE, event => getWin(event)?.unmaximize())
ipcBus.set(IpcWindowOptions.MINIMIZE, event => getWin(event)?.minimize())
ipcBus.set(IpcWindowOptions.RESTORE, event => getWin(event)?.restore())
ipcBus.set(IpcWindowOptions.RELOAD, event => getWin(event)?.reload())

// 设置全屏
ipcBus.set(IpcWindowOptions.SET_FULL_SCREEN, (event, flag: boolean) => getWin(event)?.setFullScreen(flag))
ipcBus.set(IpcWindowOptions.SET_TITLE, (event, title: string) => getWin(event)?.setTitle(title))
// 任务栏闪烁
ipcBus.set(IpcWindowOptions.FLASH_FRAME, (event, flag: boolean) => getWin(event)?.flashFrame(flag))

// 可以切换的事件

// 聚焦 失去焦点
ipcBus.set(IpcWindowOptions.SWITCH_FOCUS, (event) => {
  const win = getWin(event)
  win?.isFocused() ? win?.blur() : win?.focus()
})

// 最大化  取消最大化
ipcBus.set(IpcWindowOptions.SWITCH_MAX, (event) => {
  const win = getWin(event)
  win?.isMaximized() ? win?.unmaximize() : win?.maximize()
})

// 最小化 取消最小化
ipcBus.set(IpcWindowOptions.SWITCH_MIN, (event) => {
  const win = getWin(event)
  win?.isMinimized() ? win?.restore() : win?.minimize()
})

// 全屏 取消全屏
ipcBus.set(IpcWindowOptions.SWITCH_FULL, (event) => {
  const win = getWin(event)
  win?.setFullScreen(!win?.isFullScreen())
})

//  设置用户是否可以手动调整窗口大小。
ipcBus.set(IpcWindowOptions.SWITCH_RESIZABLE, (event) => {
  const win = getWin(event)
  win?.setResizable(!win?.isResizable())
})

// 设置用户是否可以移动窗口。 在Linux上不起作用。
ipcBus.set(IpcWindowOptions.SWITCH_MOVABLE, (event) => {
  const win = getWin(event)
  win?.setMovable(!win?.isMovable())
})

// 设置用户是否可以手动将窗口最小化。 在Linux上不起作用。
ipcBus.set(IpcWindowOptions.SWITCH_MINIMIZABLE, (event) => {
  const win = getWin(event)
  win?.setMinimizable(!win?.isMinimizable())
})

//  设置用户是否可以手动最大化窗口。 在Linux上不起作用。
ipcBus.set(IpcWindowOptions.SWITCH_MAXIMIZABLE, (event) => {
  const win = getWin(event)
  win?.setMaximizable(!win?.isMaximizable())
})

// 设置窗口是否应始终显示在其他窗口的前面。 设置后，窗口仍然是一个正常窗口，而不是一个无法获取焦点的工具框窗口。
ipcBus.set(IpcWindowOptions.SWITCH_ALWAYS_ON_TOP, (event) => {
  const win = getWin(event)
  win?.setAlwaysOnTop(!win?.isAlwaysOnTop())
})
