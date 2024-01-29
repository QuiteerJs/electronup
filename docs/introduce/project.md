---
title: 项目介绍
---

# {{ $frontmatter.title }}

## 简介

[electronup](https://github.com/QuiteerJs/electronup) 是一个集成 **Vite4.x**、**tsup6.x**、**electron-builder23.x** 的桌面端构建工具，一个配置文件完成多环境多目标的构建包。

::: warning
因为使用了 tsup 构建主进程代码，所以该命令行及脚手架只支持 `TypeScript` ，不支持 `JavaScript`。
:::

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

## 前置技术栈

::: warning 📢
正常的 electron 开发需要你掌握基本的 node 和 web 开发知识 , 如果你对前端开发完全陌生，最好不要直接在一开始针对一个框架进行学习——最好是掌握了基础知识再回到这里。
:::

如果你想要掌握本框架的完全开发能力,以下技术栈是你需要了解的。

- `Nodejs` , [Node.js® 是一个基于 Chrome V8 引擎 的 JavaScript 运行时环境。](https://nodejs.org/zh-cn/)
- `Electron` , [使用 JavaScript，HTML 和 CSS 构建跨平台的桌面应用程序。](https://www.electronjs.org/)
- `Typescript` , [TypeScript 是 JavaScript 类型的超集，它可以编译成纯 JavaScript。](https://www.tslang.cn/index.html)
- `Vite` , [下一代的前端工具链 , 为开发提供极速响应。](https://cn.vitejs.dev/)
- `tsup` , [这是构建TypeScript库的最简单、最快的方法。](https://tsup.egoist.dev/)
- `Electron-Builder` , [一个完整的解决方案，打包和构建一个准备分发 electron 应用程序与“自动更新”的支持开箱即用。](https://www.electron.build/)
- `适用于vite 的 web 框架` , [vue3.x](https://staging-cn.vuejs.org/)，[react16.x](https://zh-hans.react.dev/learn) 。。。
- 更多相关 js 知识 ...


## 集成依赖

```json
{
  "dependencies": {
    "electron-builder": "^23.6.0",
    "tsup": "^6.7.0",
    "typescript": "^5.0.4",
    "vite": "^4.4.9"
  }
}
```


##
::: tip <img src="/group.jpg" style="height:26px" />

和兴趣爱好者一起摸鱼 , 交流 !

<span>Electron 技术框架交流群 : 12354891</span>
:::
