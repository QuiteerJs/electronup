import type { IpcMainEvent, IpcMainInvokeEvent } from 'electron';

/** 来源校验选项, 内置通道 `Ipc.init` 与契约 `handleContract` 共用 */
export interface IpcInitOptions {
  /**
   * 允许调用的页面来源, 如 `['https://app.example.com', 'file://']`
   *
   * `file://` 按协议匹配, 其余按 `URL.origin` 精确匹配; 不传则不限制来源
   */
  allowedOrigins?: readonly string[];
  /**
   * 自定义来源校验, 返回 false 时忽略这次调用; 传入后替代默认校验
   *
   * 默认只接受主 frame 发起的调用, 子 frame (含第三方 iframe) 一律拒绝
   */
  validateSender?: (event: IpcMainEvent | IpcMainInvokeEvent) => boolean;
}

function matchOrigin(url: string, allowed: readonly string[]): boolean {
  if (url.startsWith('file://')) {
    return allowed.includes('file://');
  }
  try {
    return allowed.includes(new URL(url).origin);
  } catch {
    return false;
  }
}

export function createValidator(
  options: IpcInitOptions,
): (event: IpcMainEvent | IpcMainInvokeEvent) => boolean {
  if (options.validateSender) {
    return options.validateSender;
  }
  const { allowedOrigins } = options;
  return (event) => {
    const frame = event.senderFrame;
    // senderFrame 在 frame 已导航或销毁时为 null, 同样拒绝
    if (!frame || frame.parent !== null) {
      return false;
    }
    return !allowedOrigins || matchOrigin(frame.url, allowedOrigins);
  };
}
