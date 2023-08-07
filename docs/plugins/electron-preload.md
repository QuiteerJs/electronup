---
title: electron-preload
---

# @quiteer/electron-preload


> 基于electron , 提供预加载功能脚本

## 安装

```bash
npm i @quiteer/electron-preload
```
```bash
yarn add @quiteer/electron-preload
```
```bash
pnpm add @quiteer/electron-preload
```


## 使用

> 在主进程中引入预加载脚本

```js
import preload from '@quiteer/electron-preload'

const win = new BrowserWindow({
  width: 800,
  height: 600
})
```

### 暴露的api

分别暴露了以下api , 具体使用方法可参照官方 api 文档使用

- ipcRenderer
  - send
  - sendSync
  - invoke
  - on
  - once
  - removeAllListeners

- clipboard
  - readText
  - writeText
  - readHTML
  - writeHTML
  - readImage
  - writeImage
  - readRTF
  - writeRTF
  - readBookmark
  - writeBookmark
  - readFindText
  - writeFindText
  - clear
  - availableFormats
  - has
  - read
  - readBuffer
  - writeBuffer
  - write

- webFrame
  -  setZoomFactor
  -  getZoomFactor
  -  setZoomLevel
  -  getZoomLevel
  -  insertText
  -  executeJavaScript
  -  executeJavaScriptInIsolatedWorld
  -  setIsolatedWorldInfo
  -  getResourceUsage
  -  clearCache
  -  getFrameForSelector
  -  firstChild
  -  nextSibling
  -  opener
  -  parent
  -  routingId
  -  top


### 渲染进程中使用

```js
console.log('window.$ipc :>> ', window.$ipc)
console.log('window.$clipboard :>> ', window.$clipboard)
console.log('window.$webFrame :>> ', window.$webFrame)
```

#### 获取类型提示

全局类型声明
```ts
interface Window {
  $ipc: import('@quiteer/electron-preload').PreloadIpc
  $clipboard: import('@quiteer/electron-preload').PreLoadPath
  $webFrame: import('@quiteer/electron-preload').PreloadWebFrame
}
```


