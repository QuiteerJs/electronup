---
title: API
---

# {{ $frontmatter.title }}

## `defineConfig`

> 工具函数，配置智能提示。

最基础的配置文件是这样的：

```ts
// electronup.config.ts
import { defineConfig } from 'electronup'

export default defineConfig({
  // ...
})
```

注意：即使项目没有在 package.json 中开启 type: "module" ，electronup 也支持在配置文件中使用 ESM 语法。这种情况下，配置文件会在被加载前自动进行预处理。

### 情景配置

> 如果配置文件需要基于（dev/serve 或 build）命令或者不同的 模式 来决定选项，亦或者是一个 SSR 构建（ssrBuild），则可以选择导出这样一个函数：

```ts
export default defineConfig(({ command, root }) => {
  if (command === 'serve') {
    return {
      // dev 独有配置
    }
  } else {
    // command === 'build'
    return {
      // build 独有配置
    }
  }
}
```

### 异步配置

> 如果配置需要调用一个异步函数，也可以转而导出一个异步函数。这个异步函数也可以通过 defineConfig 传递，以便获得更好的智能提示：

```ts
export default defineConfig(async ({ command, mode }) => {
  const data = await asyncFunction()
  return {
    // 配置
  }
})
```

### 在配置中使用环境变量

> 暂不支持。
