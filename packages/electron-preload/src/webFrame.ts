import type { WebFrame } from 'electron';
import { webFrame } from 'electron';

/**
 * 只保留不会越过 contextIsolation 的能力
 *
 * 隔离世界执行脚本、取关联 frame 等接口要么让页面绕开隔离, 要么返回跨不过 contextBridge 的对象, 均不暴露
 */
export interface PreloadWebFrame {
  /** 更改缩放倍数, 1 为原始比例 */
  setZoomFactor(factor: number): void;
  /** 当前缩放倍数 */
  getZoomFactor(): number;
  /** 更改缩放等级 */
  setZoomLevel(level: number): void;
  /** 当前缩放等级 */
  getZoomLevel(): number;
  /** 向焦点元素插入文本 */
  insertText(text: string): void;
  /** 资源占用 */
  getResourceUsage(): ReturnType<WebFrame['getResourceUsage']>;
  /** 清空缓存 */
  clearCache(): void;
}

export const $webFrame: PreloadWebFrame = {
  setZoomFactor: (factor) => webFrame.setZoomFactor(factor),
  getZoomFactor: () => webFrame.getZoomFactor(),
  setZoomLevel: (level) => webFrame.setZoomLevel(level),
  getZoomLevel: () => webFrame.getZoomLevel(),
  insertText: (text) => webFrame.insertText(text),
  getResourceUsage: () => webFrame.getResourceUsage(),
  clearCache: () => webFrame.clearCache(),
};
