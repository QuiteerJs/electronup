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

| 参数 | 说明 |
| --- | --- |
| `-t, --template <模板>` | 指定模板，跳过选择 |
| `--overwrite` | 目标目录不为空时直接清空（保留 `.git`） |
| `-h, --help` | 显示帮助 |

生成后 `package.json#name` 会改写为项目目录名。模板锁定 pnpm，创建后请用 `pnpm install` 安装依赖。

## 模板

| 模板 | 说明 |
| --- | --- |
| `vanilla` | 原生 TypeScript + Vite |
| `vue` | Vue 3 |
| `react` | React + TypeScript |
| `react-swc` | React + TypeScript + SWC |
| `solid` | Solid |

模板通过 [giget](https://github.com/unjs/giget) 从 [electronup-template](https://github.com/QuiteerJs/electronup-template) 的对应分支实时拉取，需要可访问 GitHub 的网络环境；直连不稳定时可用 `--mirror <地址>` 或环境变量 `CREATE_ELECTRONUP_MIRROR` 指定镜像（替换 `https://github.com` 这一段，如 `https://kkgithub.com`）。

## 文档

https://quiteerjs.github.io/electronup/plugins/create-electronup

## License

[MIT](./LICENSE)
