import type { WebFrame } from 'electron'
import { webFrame } from 'electron'

export interface PreloadWebFrame {

  /**
   * 描述  更改缩放倍数。
   * @date 2022-11-11
   * @param {any} factor:number 缩放比例 1为原始比例
   * @returns {any}
   */
  setZoomFactor(factor: number): void
  /**
   * 描述  当前的缩放比例。
   * @date 2022-11-11
   * @returns {any}
   */
  getZoomFactor(): number
  /**
   * 描述  更改缩放等级。
   * @date 2022-11-11
   * @param {any} level:number  缩放等级。
   * @returns {any}
   */
  setZoomLevel(level: number): void
  /**
   * 描述  当前的缩放比例。
   * @date 2022-11-11
   * @returns {any}
   */
  getZoomLevel(): number
  /**
   * 描述  插入text 到焦点元素
   * @date 2022-11-11
   * @param {any} text:string
   * @returns {any}
   */
  insertText(text: string): void
  /**
   * 描述  在页面中执行 code。
   * @date 2022-11-11
   * @param {any} code:string
   * @param {any} userGesture?:boolean
   * @param {any} callback?:(result:any
   * @param {any} error:Error
   * @returns {any}
   */
  executeJavaScript(code: string, userGesture?: boolean, callback?: (result: any, error: Error) => void): Promise<any>
  executeJavaScriptInIsolatedWorld(...args: Parameters<WebFrame['executeJavaScriptInIsolatedWorld']>): Promise<any>
  setIsolatedWorldInfo(...args: Parameters<WebFrame['setIsolatedWorldInfo']>): void
  getResourceUsage(): ReturnType<WebFrame['getResourceUsage']>
  clearCache(): void
  getFrameForSelector(selector: string): WebFrame

  firstChild(): WebFrame['firstChild']
  nextSibling(): WebFrame['nextSibling']
  opener(): WebFrame['opener']
  parent(): WebFrame['parent']
  routingId(): WebFrame['routingId']
}

export const $webFrame: PreloadWebFrame = {
  setZoomFactor: factor => webFrame.setZoomFactor(factor),
  getZoomFactor: () => webFrame.getZoomFactor(),
  setZoomLevel: level => webFrame.setZoomLevel(level),
  getZoomLevel: () => webFrame.getZoomLevel(),
  insertText: level => webFrame.insertText(level),
  executeJavaScript: level => webFrame.executeJavaScript(level),
  executeJavaScriptInIsolatedWorld: (...args) => webFrame.executeJavaScriptInIsolatedWorld(...args),
  setIsolatedWorldInfo: (...args) => webFrame.setIsolatedWorldInfo(...args),
  getResourceUsage: () => webFrame.getResourceUsage(),
  clearCache: () => webFrame.clearCache(),
  getFrameForSelector: selector => webFrame.getFrameForSelector(selector),
  firstChild: () => webFrame.firstChild,
  nextSibling: () => webFrame.nextSibling,
  opener: () => webFrame.opener,
  parent: () => webFrame.parent,
  routingId: () => webFrame.routingId
}

