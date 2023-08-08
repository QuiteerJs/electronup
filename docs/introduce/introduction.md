---
title: 快速上手
---

# {{ $frontmatter.title }}

本节将帮助您从头开始构建 [**electron**](https://www.electronjs.org/zh/) 应用。

## 创建模板

::: tip  基本要求
在使用 `Electron` 进行开发之前，您需要安装 `Node.js`。 建议您使用最新的 `LTS` 版本或官网当前长期维护版。
本地环境需要安装 [`npm` | `yarn 1.x` | `pnpm`] 、 `Git`。
:::

使用 `npm`:

```bash
npm init electronup@latest
```

or

```bash
npm create electronup@latest
```

使用 `yarn`:

```bash
yarn create electronup
```

使用 `pnpm`:

```bash
pnpm create electronup
```


这一指令将会安装并执行 [**create-electronup**](https://github.com/QuiteerJs/create-electronup)，它是 [**electronup**](https://github.com/QuiteerJs/electronup) 的项目模板脚手架工具。你将会看到一些模板选项提示,根据提示选择想要的模板即可完成创建。


## 安装依赖

:::warning 使用 pnpm
使用 pnpm 安装依赖前需要在 install 前根据注释放开配置。
:::

模板中内置了 npm 源的一些配置，可以根据需要放开注释后安装依赖。

```yaml
# .npmrc
# 一些镜像配置
registry=https://registry.npmmirror.com
electron_mirror=https://cdn.npmmirror.com/binaries/electron/
electron_builder_binaries_mirror=https://npmmirror.com/mirrors/electron-builder-binaries/
# sqlite3_mirror=https://cdn.npmmirror.com/binaries/sqlite3/
# node_sqlite3_binary_host_mirror=https://npmmirror.com/mirrors/sqlite3/

# 如果你使用的是 pnpm 包管理器，打开以下配置。
# https://pnpm.io/zh/npmrc#strict-peer-dependencies
# strict-peer-dependencies=false
# https://pnpm.io/zh/cli/run#shell-emulator
# shell-emulator=true
# https://pnpm.io/zh/npmrc#auto-install-peers
# auto-install-peers=false
# https://pnpm.io/zh/npmrc#node-linker
# node-linker=hoisted
```

## 命令行

```json
{
  "scripts": {
  // 启动开发环境（不压缩）
    "dev": "electronup --no-minify",
    // 构建发布
    "build": "electronup build",
    // 生成 dir
    "dir": "electronup build --dir --no-asar --no-minify",
    // 预构建
    "postinstall": "electron-builder install-app-deps"
  }
}
```

::: details 安装依赖过程中可能出现装不上依赖或者 `rebuild` 报错等问题情况
建议进群一起交流 群号 : **12354891**
:::
