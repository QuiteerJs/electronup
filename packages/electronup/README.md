# electronup
[![license](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE) ![](https://img.shields.io/github/stars/QuiteerJs/electronup) ![](https://img.shields.io/github/forks/QuiteerJs/electronup)

> electronup 是一个集成 Vite4.x、tsdown、electron-builder24.x 的桌面端构建工具，一个配置文件完成多环境多目标的构建包。

## 文档地址

文档地址 ：https://quiteerjs.github.io/electronup

## 安装

```bash
npm install electronup -D
```

```bash
yarn add electronup -D
```

```bash
pnpm add electronup -D
```

## 特性

- **多框架支持** : 使用 `create-electronup` 询问式创建项目模板 , 内置 `vue3` ， `react` ，`solid` 等项目模板。
- **Vite + tsdown** : 双进程热更新 , 快速开发(主进程代码修改会触发软件重启)。
- **统一的环境变量** : `dotenv` 加载 , 构建时注入 , 双进程拥有相同的环境变量。
- **模式构建** : 默认识别当前代码运行的平台输出打包程序 。
- **可选构建功能提示** : 你将获得可选范围内支持的功能提示 , 选项式自定义构建输出。
- **TypeScript** : 应用程序级 `JavaScript` 的语言。
- **集中管理路径** : 解决双进程资源路径的问题。
- **预置配置** : 内置了很多可以覆盖的构建工具配置。
- **单文件配置** : 只需一个 **electronup.config.ts** 即可管理项目的运行构建。
- **多插件** : 作者会继续开发更多无副作用的独立插件，如：创建窗口，预加载，ipc通信，更新等等。

## 声明

前提条件
> 熟悉命令行
> 已安装 18.0 或更高版本的 Node.js


因为使用了 tsdown 构建主进程代码，所以该命令行及脚手架只支持 TypeScript ，不支持 JavaScript。

## 示例

> https://github.com/QuiteerJs/electronup/tree/main/playground/electronup-test

## 自动更新

内置了 `electron-updater` ，在主进程的 `app.whenReady()` 中初始化更新器：

```ts
import { initAutoUpdater } from 'electronup'

app.whenReady().then(() => {
  initAutoUpdater({ checkOnStart: true, autoDownload: true })
})
```

发布配置写在 `electronup.config.ts` 的 `builderConfig` 中：

```ts
export default defineConfig({
  builderConfig: {
    publish: [{ provider: 'github', owner: 'your-org', repo: 'your-app' }],
  },
})
```

electron-builder 的 `publish` 配置决定更新源。开发环境会跳过检查；生产环境启动时自动检查。需要自定义更新 UI 时，可监听导出的 `autoUpdater` 的更新事件。

> **打包注意** ：打包后的应用运行时需要能解析到 `electron-updater` 。请把它加入项目 `dependencies`（生产依赖，electron-builder 会自动打包），并在 `tsdownConfig.noExternal` 中加入 `'electronup'` 让更新器代码打进主进程产物。
