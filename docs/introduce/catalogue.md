---
title: 目录介绍
---

# {{ $frontmatter.title }}

## 概览

## 以 vue 模板为例

:::tip
接下来会逐个文件进行讲解说明。
:::

```sh
|-- template-vue
    |-- .env
    |-- .env.development
    |-- .env.production
    |-- .eslintrc
    |-- .gitignore
    |-- .npmrc
    |-- electronup.config.ts
    |-- LICENSE
    |-- package.json
    |-- README.md
    |-- tsconfig.json
    |-- tsconfig.node.json
    |-- .vscode
    |   |-- extensions.json
    |   |-- settings.json
    |-- main
    |   |-- index.ts
    |   |-- utils
    |       |-- common.ts
    |       |-- is.ts
    |-- public
    |   |-- avatar.png
    |   |-- icon.png
    |   |-- vite.svg
    |-- render
    |   |-- App.vue
    |   |-- index.html
    |   |-- main.ts
    |   |-- assets
    |   |   |-- vue.svg
    |   |-- loading
    |   |   |-- index.vue
    |   |-- store
    |   |   |-- index.ts
    |   |-- styles
    |       |-- style.css
    |-- typings
        |-- env.d.ts
        |-- global.d.ts

```

## `.env.*`

> 环境变量，可根据自己需求设置不同后缀实现不同环境的环境变量。

- **.env** : 默认加载的环境变量。
- **.env.development** : 开发环境变量。
- **.env.production** : 生产环境变量。

## `.eslintrc`

eslint配置。

## `.gitignore`

git 忽略目录。

## `.npmrc`

项目下包管理器的配置，npmrc比较通用，yarn也会读取该文件的配置。

## `electronup.config.ts`

**electronup** 核心配置，用户自定义配置文件。

## `LICENSE`

开源协议。

## `package.json`

项目管理信息。

## `README.md`

项目说明。

## `tsconfig.json`

渲染进程 ts 规则配置。

## `tsconfig.node.json`

node 环境下 ts 的配置。

## `.vscode`

vscode 配置，作用于项目内，不影响全局配置。

### `extensions.json`

插件推荐。

### `settings.json`

编辑器配置。

## `main`

> 主进程可用。

主进程环境代码为 `nodejs`, 明确的隔离提升代码可读性。

## `public`

> 静态资源目录

该目录下的文件总会输出至项目根目录。

## `render`

> 渲染进程可用。

熟悉的前端 vue 目录 , 基本与平时的 `vue3` 项目结构一致。

## `typings`

> 双进程可用。

全局类型定义, `*.d.ts` 统一存放 , 无需导出 , 可自定定义添加类型文件。

