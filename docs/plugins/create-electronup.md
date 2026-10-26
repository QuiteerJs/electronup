---
title: create-electronup
---

# {{ $frontmatter.title }}

> 一键生成基于 [electronup](https://github.com/QuiteerJs/electronup) 的项目模板。

支持 `vanilla`、`vue`、`react`、`react-swc`、`solid` 五种模板，分别对应 [electronup-template](https://github.com/QuiteerJs/electronup-template) 仓库的分支。

## 创建项目

```bash
pnpm create electronup
```

或使用 npm：

```bash
npm create electronup@latest
```

也可以直接指定项目名和模板：

```bash
pnpm create electronup my-app --template vue
```

`--template` 的短参数为 `-t`。不传项目名时脚手架会询问：

```text
? 项目名称： » electronup-project
```

项目名传 `.` 表示在当前目录创建；如果目录不为空，会先询问是否清空（`.git` 会保留），传 `--overwrite` 则不再询问直接清空。

生成后脚手架会把 `package.json` 的 `name` 改写为项目目录名（不是合法包名时会规整，例如 `My App` → `my-app`）。electron-builder 默认的 `appId` 由它生成，因此不同项目不会共用同一个 `appId`。

## 命令行参数

| 参数 | 说明 |
| --- | --- |
| `[项目目录]` | 项目目录，不传时询问 |
| `-t, --template <模板>` | 指定模板，跳过选择 |
| `--overwrite` | 目标目录不为空时直接清空（保留 `.git`） |
| `-h, --help` | 显示帮助 |

取消操作或模板拉取失败时，进程以退出码 `1` 结束。

## 可用模板

| 模板 | 说明 |
| --- | --- |
| `vanilla` | 原生 TypeScript + Vite |
| `vue` | Vue 3 |
| `react` | React + TypeScript |
| `react-swc` | React + TypeScript + SWC |
| `solid` | Solid |

交互选择 `react` 后还会询问使用普通 TypeScript 还是 SWC 变体；命令行直接传 `-t react` 或 `-t react-swc` 时不再询问。

## 模板来源

脚手架不会把模板打进包里，而是通过 [degit](https://github.com/Rich-Harris/degit) 从远程仓库实时拉取：

```text
https://github.com/QuiteerJs/electronup-template.git#<template>
```

因此创建项目时需要能够访问 GitHub。拉取失败时脚手架会给出对应分支的 `git clone` 命令，可以手动克隆。

## 创建完成后

脚手架只负责拉取模板，不会安装依赖。模板通过 `packageManager` 字段与 `pnpm-lock.yaml` 锁定 pnpm，所以无论用哪种包管理器创建，都会提示使用 pnpm（未安装时可先执行 `corepack enable`）：

```bash
cd my-app
pnpm install
pnpm dev
```
