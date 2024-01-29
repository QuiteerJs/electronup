
<div align="center">
	<h1>electronup-project</h1>
  <p>使用 <a href="https://github.com/QuiteerJs/electronup">electronup</a> cli 驱动。</p>
</div>

# [electronup](https://github.com/QuiteerJs/electronup)
[![license](https://img.shields.io/badge/license-MIT-green.svg)](./LICENSE) ![](https://img.shields.io/github/stars/QuiteerJs/electronup) ![](https://img.shields.io/github/forks/QuiteerJs/electronup)

> electronup 是一个集成 Vite4.x、tsup6.x、electron-builder24.x 的桌面端构建工具，一个配置文件完成多环境多目标的构建包。

## 文档地址

文档地址 ：https://quiteerjs.github.io/electronup


## 特性

- **多框架支持** : 使用 `create-electronup` 询问式创建项目模板 , 内置 `vue3` ， `react` ，`solid` 等项目模板。
- **Vite + tsup** : 双进程热更新 , 快速开发(主进程代码修改会触发软件重启)。
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
> 已安装 16.0 或更高版本的 Node.js


因为使用了 tsup 构建主进程代码，所以该命令行及脚手架只支持 TypeScript ，不支持 JavaScript。


### 一些便携包的相关配置参考

- `electronup`

https://www.npmjs.com/package/electronup

- `@quiteer/electron-ipc`

https://www.npmjs.com/package/@quiteer/electron-ipc

- `@quiteer/electron-preload`

https://www.npmjs.com/package/@quiteer/electron-preload

如果你觉得这个项目对你有帮助，可以动动小手 `star` 一下 ， 非常感谢！！！
