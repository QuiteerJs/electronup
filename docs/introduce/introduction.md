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


这一指令将会安装并执行 [**create-electronup**](https://github.com/QuiteerJs/electronup/tree/main/packages/create-electronup)，它是 [**electronup**](https://github.com/QuiteerJs/electronup) 的项目模板脚手架工具。你将会看到一些模板选项提示,根据提示选择想要的模板即可完成创建。

::: tip ps
如果你想要在当前目录下创建项目，
项目名称填入 `.` 即可： <br />
`? Project name: » .`
:::

### create-electornup 命令行参数

> `-t` or `--template`

可选项：

- vanilla
- vue
- react
- react-swc
- solid

示例：

```bash
create-electronup vanilla-project --template vanilla
```

```bash
create-electronup vue-project -t vue
```

```bash
create-electronup react-project -t react
```

```bash
create-electronup react-swc-project -t react-swc
```

```bash
create-electronup solid-project -t solid
```


## 安装依赖

使用 `npm`:

```bash
npm install
```


使用 `yarn`:

```bash
yarn install
```

使用 `pnpm`:

```bash
pnpm install
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
