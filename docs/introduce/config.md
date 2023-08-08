---
title: 配置
---

# {{ $frontmatter.title }}

[electronup cli](https://github.com/QuiteerJs/electronup) 集成并内置了 [vite](https://cn.vitejs.dev/) , [tsup](https://tsup.egoist.dev/) , [electron-builder](https://www.electron.build/) ,并没有加以魔改，只是在**其三**之上做了一些预置配置，除了一些关键性的路径配置，您完全可以传入相同的参数将其覆盖，配置属于您自己的配置。

[electronup cli](https://github.com/QuiteerJs/electronup) 有且只导出了一个帮助开发者提供代码提示的 **api** ：[defineConfig](/api/)，在编写 `electronup.config.ts` 时提供正确的引导。

## `electronup.config.ts`

首先需要在项目根目录下创建 `electronup.config.ts` 文件，非根目录下的 `electronup.config.ts` 需要在运行时通过命令行参数指定路径。

关于项目中的资源路径问题，提升了配置层级，在最外层进行路径配置，当然不配置也可以，已经提供了默认路径，只需要创建对应目录就行。

### `renderDir`
> 渲染进程入口目录，也就是 web 入口目录。

### `mainDir`
> 主进程入口目录。

### `publicDir`
> 静态资源目录。


### `libDir`
> 动态库目录。


### `resourceDir`
> 资源构建输出目录。就是 `dev` 时的输出目录。


### `outDir`
> 桌面端产物目录。就是 `build` 时的输出目录。

::: tip
以上路径都是基于根目录下，
最终会和根目录路径拼接，
以上路径在 vite tsup electron-builder 中配置不会生效。
:::

## vite

> 渲染进程构建程序。

[electronup cli](https://github.com/QuiteerJs/electronup) 中预置了 [vite](https://cn.vitejs.dev/) ，除以下几项配置无法直接覆盖，其余和 [vite](https://cn.vitejs.dev/) 配置无二。

### `base`

> 可以覆盖，预置为 `./`。

该配置一般配合模板，如果需要改动需要同步配置 `index.html` 中的资源路径，（不推荐改动）。

[查看 vite 官网详细说明](https://cn.vitejs.dev/config/shared-options.html#base) 。


### `build`

> 该配置预置了两个选项。

- `minify`
  - 不可覆盖，可通过命令行参数 `--no-minify` 控制。
- `outDir`
  - `outDir` 只能通过外部的 `resourceDir` 配置项覆盖。

[其他选项参考 vite 官网说明](https://cn.vitejs.dev/config/build-options.html)。

### `root`

> 渲染进程根目录，也就是 `index.html` 所在的目录。

`root` 只能通过外部的 `renderDir` 配置项覆盖。

[查看 vite 官网详细说明](https://cn.vitejs.dev/config/shared-options.html#root) 。

### `publicDir`

> 全局静态资源目录。

`publicDir` 只能通过外部的 `publicDir` 配置项覆盖。


[electronup 中的 vite 详细配置查看](https://github.com/QuiteerJs/electronup/blob/main/src/configs/vite.ts)。

## tsup

> 用于构建主进程代码，预置配置已满足大部分开发，故此暴露了少量的配置项。

[tsup](https://tsup.egoist.dev/) 构建时，会同步注入用户配置的环境变量以保证双进程统一。

### `external`

> 排除参与构建的 modules。
> 以数组的形式配置。

### `noExternal`

> 总是参与构建的 modules。
> 以数组的形式配置。

[electronup 中的 tsup 详细配置查看](https://github.com/QuiteerJs/electronup/blob/main/src/configs/tsup.ts#L77)。

## electron-builder

> 预置配置皆可覆盖，路径类配置需要在外部配置。

[electronup 中的 electron-builder 详细配置查看](https://github.com/QuiteerJs/electronup/blob/main/src/configs/builder.ts#L36)。

:::tip 提示
命令行参数权重高于用户配置，请结合文档完成构建配置。
:::

## 预置配置示例

> 以下配置是 `template-react` 模板构建后生成的 `electronup-effective-config.yaml` 配置文件，仅供参考。

```yaml
vite:
  base: ./
  root: render
  server:
    host: 0.0.0.0
  build:
    outDir: E:\demo\template-react\dist\resource
    target: esnext
    minify: esbuild
    reportCompressedSize: false
    emptyOutDir: true
  resolve:
    alias:
      '@': E:\demo\template-react\render
  plugins:
    -
      - name: vite:react-babel
        enforce: pre
      - name: vite:react-refresh
        enforce: pre
  publicDir: E:\demo\template-react\public
tsup:
  minify: false
  external:
    - electron
  entry:
    electron: E:\demo\template-react\main\index.ts
  outDir: dist/resource
  watch: false
  dts: false
  clean: false
  env:
    VITE_HELLO: 你好！electronup！
    VITE_MODE_TEXT: 这里是生产环境
    NODE_ENV: production
builder:
  config:
    asar: true
    appId: org.quiteer.electronup
    productName: electronup-app
    protocols:
      name: electronup-app
      schemes:
        - deeplink
    nsis:
      oneClick: false
      language: '2052'
      perMachine: true
      allowElevation: true
      allowToChangeInstallationDirectory: true
      runAfterFinish: true
      createDesktopShortcut: true
      createStartMenuShortcut: true
      artifactName: electronup-app ${arch} Setup 1.0.0.${ext}
    files:
      - filter:
          - dist/resource/**/*
    extraFiles:
      - filter:
          - lib
    directories:
      output: dist/out
    win:
      icon: public/icon.png
      target:
        target: nsis
        arch: ia32
  x64: false
  ia32: false
  armv7l: false
  arm64: false
  universal: false
  dir: false
```
