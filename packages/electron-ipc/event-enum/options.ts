export enum IpcWindowOptions {
  /**
   * 销毁窗口
   */
  DESTROY = 'destroy',
  /**
   * 关闭窗口
   */
  CLOSE = 'close',
  /**
   * 窗口显示
   */
  SHOW = 'show',
  /**
   * 窗口隐藏
   */
  HIDE = 'hide',
  /**
   * 窗口获取焦点
   */
  FOCUS = 'focus',
  /**
   * 窗口失去焦点
   */
  BLUR = 'blur',
  /**
   * 窗口最大化
   */
  MAXIMIZE = 'maximize',
  /**
   * 取消窗口最大化
   */
  UNMAXIMIZE = 'unmaximize',
  /**
   * 窗口最小化
   */
  MINIMIZE = 'minimize',
  /**
   * 还原窗口
   */
  RESTORE = 'restore',
  /**
   * 刷新窗口
   */
  RELOAD = 'reload',
  /**
   * 窗口全屏
   */
  SET_FULL_SCREEN = 'setFullScreen',
  /**
   * 设置窗口
   */
  SET_TITLE = 'setTitle',
  /**
   * 任务栏闪烁
   */
  FLASH_FRAME = 'flashFrame',
  /**
   * 可以切换的事件
   * 聚焦
   * 失去焦点
   */
  SWITCH_FOCUS = 'switch-focus',
  /**
   * 可以切换的事件
   * 最大化
   * 取消最大化
   */
  SWITCH_MAX = 'switch-max',
  /**
   * 可以切换的事件
   * 最小化
   * 取消最小化
   */
  SWITCH_MIN = 'switch-min',
  /**
   * 可以切换的事件
   * 全屏
   * 取消全屏
   */
  SWITCH_FULL = 'switch-full',
  /**
   * 可以切换的事件
   * 设置用户是否可以手动调整窗口大小。
   */
  SWITCH_RESIZABLE = 'switch-resizable',
  /**
   * 可以切换的事件
   * 设置用户是否可以移动窗口。 在Linux上不起作用。
   */
  SWITCH_MOVABLE = 'switch-movable',
  /**
   * 可以切换的事件
   * 设置用户是否可以手动将窗口最小化。 在Linux上不起作用。
   */
  SWITCH_MINIMIZABLE = 'switch-minimizable',
  /**
   * 可以切换的事件
   * 设置用户是否可以手动最大化窗口。 在Linux上不起作用。
   */
  SWITCH_MAXIMIZABLE = 'switch-maximizable',
  /**
   * 可以切换的事件
   * 设置窗口是否应始终显示在其他窗口的前面。
   */
  SWITCH_ALWAYS_ON_TOP = 'switch-always-on-top'
}

export enum IpcFileOptions {
  /**
   * path.basename
   */
  BASENAME = 'basename',
  /**
  * path.dirname
  */
  DIRNAME = 'dirname',
  /**
   * path.extname
   */
  EXTNAME = 'extname',
  /**
  * path.join
  */
  JOIN = 'join',
  /**
  * path.parse
  */
  PARSE = 'parse',
  /**
  * path.relative
  */
  RELATIVE = 'relative',
  /**
  * path.resolve
  */
  RESOLVE = 'resolve'
}
