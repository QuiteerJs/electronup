---
title: create-electronup
---

# {{ $frontmatter.title }}

> 一键生成基于 [electronup](https://github.com/QuiteerJs/electronup) 的项目模板。
> 目前内置了 vue 、 react 、 react-swc。

## 按需创建模板

打开控制台输入:

```bash
npm init electronup [project-name]
```

or 

```bash
npm create electronup [project-name]
```

`npm create electronup` 后为项目名称，或者传入项目名称，即在当前目录下创建输入的项目名称的模板。

不传则会弹出询问
```bash
? Project name: » electronup-project
```
传入 `.` 即为当前目录，会在当前目录下创建模板。

而后选择模板，根据提示完成项目创建。
