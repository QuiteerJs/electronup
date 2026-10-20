---
title: 目录介绍
---

# {{ $frontmatter.title }}

## 概览

模板由 [create-electronup](https://github.com/QuiteerJs/electronup/tree/main/packages/create-electronup) 从远程仓库 [electronup-template](https://github.com/QuiteerJs/electronup-template) 拉取，不同框架对应不同分支（`vue` / `react` / `react-swc` / `solid` / `vanilla`），拉取到的目录结构即为下文所示。

按用途大致分为三类：

- 根目录配置文件：`package.json`、`tsconfig*.json`、`electronup.config.ts` 等。
- 双进程源码目录：`main`（主进程）、`render`（渲染进程）。
- 静态资源目录：`public`。

## 以 vue 模板为例

> 下面以 `vue` 分支为例。

:::tip
接下来会逐个文件进行讲解说明。
:::

```text
vue
├── .vscode
│   └── settings.json
├── main
│   └── index.ts
├── public
│   └── vite.svg
├── render
│   ├── index.html
│   ├── main.ts
│   ├── style.css
│   ├── counter.ts
│   └── typescript.svg
├── .env
├── .env.development
├── .env.production
├── .env.staging
├── .env.test
├── .gitignore
├── .node-version
├── .npmrc
├── electronup.config.ts
├── eslint.config.js
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
└── tsconfig.node.json
```

## `.env.*`

> 环境变量文件，可根据后缀区分不同环境。

- **.env** : 默认加载，任何环境都会读取。
- **.env.development** : `electronup dev` 时加载。
- **.env.production** : `electronup build` 时加载。
- **.env.staging** : `electronup -m staging` 时加载。
- **.env.test** : `electronup -m test` 时加载。

加载规则与 `--mode` 的关系详见 [命令行界面](/introduce/cli)。

## `.gitignore`

git 忽略配置。

## `.node-version`

声明项目所需的 Node.js 版本，配合 fnm / nvm / volta 等版本管理工具自动切换。

## `.npmrc`

项目下包管理器的配置，npmrc 比较通用，npm / yarn / pnpm 都会读取该文件的配置。

## `electronup.config.ts`

**electronup** 核心配置，用户自定义配置文件，可配置 vite、tsdown、electron-builder 以及各项路径。

配置项说明详见 [配置](/introduce/config)。

## `eslint.config.js`

eslint 扁平配置 ( flat config )。

## `package.json`

项目管理信息，包含依赖与 `dev`、`build` 等脚本。

脚本说明详见 [命令行界面](/introduce/cli)。

## `pnpm-lock.yaml`

pnpm 依赖锁文件，模板默认使用 pnpm 安装依赖。

## `tsconfig.json`

渲染进程 ts 规则配置。

## `tsconfig.node.json`

主进程 ( node 环境 ) ts 规则配置。

## `.vscode`

vscode 配置，作用于项目内，不影响全局配置。

### `settings.json`

编辑器配置。

## `main`

> 主进程可用。

主进程代码运行在 `nodejs` 环境，与渲染进程隔离；默认入口为 `main/index.ts` ( 可通过 `mainDir` 修改 )，构建产物输出至 `resourceDir`。

## `public`

> 静态资源目录。

该目录下的文件不参与打包，构建时原样拷贝至输出目录 `resourceDir`，适合存放图标等无需处理的资源。

## `render`

> 渲染进程可用。

渲染进程源码目录，包含入口 `index.html`、`main.ts`、样式以及模板内置的示例代码 ( `counter.ts`、`typescript.svg` )，结构基本与平时的 `vue3` 项目一致，按实际业务替换即可。
