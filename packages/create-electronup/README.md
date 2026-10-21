# create-electronup

> 通过 `npm create electronup` 创建由 [electronup](https://github.com/QuiteerJs/electronup) 驱动的项目模板。

## 使用

```bash
pnpm create electronup
```

或指定项目名与模板：

```bash
pnpm create electronup my-app --template vue
```

## 模板

| 模板 | 说明 |
| --- | --- |
| `vanilla` | 原生 TypeScript + Vite |
| `vue` | Vue 3 |
| `react` | React + TypeScript |
| `react-swc` | React + TypeScript + SWC |
| `solid` | Solid |

模板通过 [degit](https://github.com/Rich-Harris/degit) 从 [electronup-template](https://github.com/QuiteerJs/electronup-template) 的对应分支实时拉取，需要可访问 GitHub 的网络环境。

## 文档

https://quiteerjs.github.io/electronup/plugins/create-electronup

## License

[MIT](./LICENSE)
