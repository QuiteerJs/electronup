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

项目名传 `.` 表示在当前目录创建；如果目录不为空，会先询问是否清空（`.git` 会保留）。

## 可用模板

| 模板 | 说明 |
| --- | --- |
| `vanilla` | 原生 TypeScript + Vite |
| `vue` | Vue 3 |
| `react` | React + TypeScript |
| `react-swc` | React + TypeScript + SWC |
| `solid` | Solid |

选择 `react` 后还会询问使用普通 TypeScript 还是 SWC 变体。

## 模板来源

脚手架不会把模板打进包里，而是通过 [degit](https://github.com/Rich-Harris/degit) 从远程仓库实时拉取：

```text
https://github.com/QuiteerJs/electronup-template.git#<template>
```

因此创建项目时需要能够访问 GitHub。

## 创建完成后

脚手架只负责拉取模板，不会安装依赖。完成后按提示执行：

```bash
cd my-app
pnpm install
pnpm dev
```
