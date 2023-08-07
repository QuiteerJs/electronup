---
title: 命令行界面
---

# {{ $frontmatter.title }}

> 获得帮助

```bash
electronup  --help
```
:::details 点击查看
```bash
electronup/0.0.1

Usage:
  $ electronup [config-file]

Commands:
  [config-file]  start dev server
  build [root]   构建

For more info, run any command with the `--help` flag:
  $ electronup --help
  $ electronup build --help

Options:
  -p , --port <port>  [number] 渲染进程的端口号 ，如果占用会切换非占用的端口
  -m , --mode <mode>  [development | production | test | staging | ...] 环境模式
  --no-minify         使主进程和渲染进程代码压缩  (default: true)
  -h, --help          Display this message
  -v, --version       Display version number
```
:::

```bash
electronup build --help
```

:::details 点击查看
```bash
electronup/0.0.1

Usage:
  $ electronup build [root]

Options:
  -o , --option       自定义 , 自定义构建选项
  --dir               只生成目录
  --no-asar           asar false (default: true)
  --win                构建 win 平台下的输出包
  --mac                构建 mac 平台下的输出包
  --linux              构建 linux 平台下的输出包
  --ia32               构建 ia32 架构
  --x64                构建 x64 架构
  --arm64              构建 arm64 架构
  --armv7l             构建 armv7l 架构
  --universal          构建 universal 平台包
  -m , --mode <mode>  [development | production | test | staging | ...] 环境模式
  --no-minify         使主进程和渲染进程代码压缩  (default: true)
  -h, --help          Display this message
```
:::

查看命令行版本

```bash
electronup -v
```

## `-m` , `--mode`

> 通过添加命令行指令 `-m xxx | -mode xxx` 指定加载环境变量文件以满足不同环境下的不同环境变量。

:::tip 不传 mode 参数，默认根据环境区分加载环境变量。
`electronup dev`  -->  `.env` , `.env.devlepoment` <br />
`electronup build` --> `.env` , `.env.production`
:::

`mode` 指令传入的 `mode` 字符串需与根目录下的 `env` 文件一致。 规则如下

```bash
electronup -m test
```

命令行运行后根据 `mode` 参数加载根目录下的 `.env.test` 环境变量文件

即 `electronup -m test` --> `.env` , `.env.test`

当然也可通过传入 mode 参数使 dev 环境加载 production 的环境变量:

```bash
electronup dev -m production
```

## `--no-minify`
> 为了方便调试，故添加了这条命令行参数。
> 传入后代码不会被压缩。

```bash
electronup dev --no-minify
```

```bash
electronup build --no-minify
```

## `electronup dev`

可省略 `dev`
```bash
electronup
```

### 指定配置文件

```bash
electronup
```
:::tip 提示
不指定即为项目根目录下的 electronup.config.ts
:::

```bash
electronup [config file]
```

```bash
electronup dev [config file]
```

### `-p` , `--port`

> 指定 dev 下 web 服务端口号

```bash
electronup -p 3000
```

or

```bash
electronup --port 3000
```

## `electronup build`

每次只能构建一个平台下的输出，如果需要构建多平台的包，需要分批次执行构建命令行，记得保存输出。

### 指定配置文件

```bash
electronup build
```
:::tip
不指定即为项目根目录下的 electronup.config.ts
:::

```bash
electronup build [config file]
```

### `-o` , `--option`

>开启选项式构建

> 传入此参数后 无需传入其他参数，都会以询问选择的方式记录选项
> mac系统可以打三端的包，win 下只能打 win 的包
> 因此当前系统为 mac 的话，询问选项会包含三端。

```bash
electronup build -o
```

or 

```bash
electronup build --option
```

### `--dir`

> 无安装包版本的构建产物，可以直接点击启动软件。

### `--no-asar`

> [asar](https://github.com/electron/asar) 是一种将多个文件合并成一个文件的类 tar 风格的归档格式。Electron 可以无需解压整个文件，就能够从其中读取任意文件内容。

在 Electron 中有两类 APIs：Node.js 提供的 Node API 和 Chromium 提供的 Web API。这两种 API 都支持从 asar 包中读取文件。

#### Node API

由于 Electron 中打了特别补丁， Node API 中如 fs.readFile 或者 require 之类的方法可以将 asar 视之为虚拟文件夹，读取 asar 里面的文件就和从真实的文件系统中读取一样。
尽管我们已经尽了最大努力使得 asar 包在 Node API 下的应用尽可能的趋向于真实的目录结构，但仍有一些底层 Node API 我们无法保证其正常工作。

#### Web API

在 Web 页面里，用 file: 协议可以获取 asar 包中文件。和 Node API 一样，视 asar 包如虚拟文件夹。

::: warning asar 包是只读的 
asar 包中的内容不可更改，所以 Node APIs 里那些可以用来修改文件的方法在对待 asar 包时都无法正常工作。
<br />
尽管 asar 包是虚拟文件夹，但其实并没有真实的目录架构对应在文件系统里，所以你不可能将 working Directory 设置成 asar 包里的一个文件夹。
<br />
将 asar 中的文件夹以 cwd 形式作为参数传入一些 API 中也会报错。
:::


### `--win` , `--mac` , `--linux`

> 三选一，指定平台，不指定为当前平台。

- win
- mac
- linux

仅支持 Windows 7 及其以后的版本，之前的版本中是不能工作的。

对于 Windows 提供 x86 和 amd64 (x64) 版本的二进制文件。需要注意的是ARM 版本的 Windows 目前尚不支持.

### `--ia32` , `--x64` , `--arm64` , `--armv7l` , `--universal`

> 可不指定平台架构版本， 默认为本机当前平台架构版本。

- ia32
- x64
- arm64
- armv7l
- universal

::: tip 
如果您的构建目标比较稳定，建议在 `electronup.config.ts` 中配置完善即可。
安装程序比较繁多，所以没有预制命令行参数。
在"配置"章节会有详细说明。
:::

