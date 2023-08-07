---
title: 快速上手
---

# {{ $frontmatter.title }}

本节将帮助您从头开始构建 [**electron**](https://www.electronjs.org/zh/) 应用。

## 创建模板

::: tip  基本要求
在使用 Electron 进行开发之前，您需要安装 Node.js。 建议您使用最新的 LTS 版本或官网当前长期维护版。
本地环境需要安装 yarn 1.x 、 Git。
:::

使用 Yarn:

```bash
yarn create electronup
```

or

```bash
npm init electronup@latest
```

这一指令将会安装并执行 [**create-electronup**](https://github.com/QuiteerJs/create-electronup)，它是 [**electronup**](https://github.com/QuiteerJs/electronup) 的项目模板脚手架工具。你将会看到一些模板选项提示,根据提示选择想要的模板即可完成创建。


## 安装依赖

模板中内置了 npm 源的一些配置，可以根据需要放开注释后安装依赖。

```
# .npmrc
# 一些镜像配置
# registry=https://registry.npmmirror.com
# electron_mirror=https://cdn.npmmirror.com/binaries/electron/
# electron_builder_binaries_mirror=https://npmmirror.com/mirrors/electron-builder-binaries/
# sqlite3_mirror=https://cdn.npmmirror.com/binaries/sqlite3/
# node_sqlite3_binary_host_mirror=https://npmmirror.com/mirrors/sqlite3/
```

## 命令行

```json
 "scripts": {
    // 启动开发环境（不压缩）
    "dev": "electronup --no-minify",
    // 构建发布
    "build": "electronup build",
    // 生成 dir
    "dir": "electronup build --dir --no-asar --no-minify",
    // 限定包管理工具
    "preinstall": "npx only-allow yarn",
    // 预构建
    "postinstall": "electron-builder install-app-deps"
  },
```

::: details 安装依赖过程中可能出现装不上依赖或者 `rebuild` 报错等问题情况
建议进群一起交流 群号 : **12354891**
:::
