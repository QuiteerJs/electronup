---
title: 配置
---

# {{ $frontmatter.title }}

electronup 只导出一个用于类型提示的函数：[`defineConfig`](/api/)。它不改变任何运行时行为，只是帮你写出类型正确的配置。

配置文件需要在项目根目录创建，非根目录下的文件可以在运行时通过命令行参数指定路径。

## 配置文件

支持的文件名（按查找优先级）：

```text
electronup.config.ts
electronup.config.mjs
electronup.config.cjs
electronup.config.js
```

推荐的写法：

```ts
// electronup.config.ts
import { defineConfig } from 'electronup'

export default defineConfig({
  // ...
})
```

`defineConfig` 也支持函数或异步函数形式：

```ts
import { defineConfig } from 'electronup'

export default defineConfig(({ command, mode, root }) => {
  return {
    // command 为 'serve'（dev）或 'build'；mode 为 -m 指定的模式
  }
})
```

## 路径配置

这些配置项位于最外层，决定各构建阶段的输入与输出目录：

| 配置项 | 默认值 | 作用 |
| --- | --- | --- |
| `renderDir` | `render` | 渲染进程根目录，作为 Vite 的 `root` |
| `mainDir` | `main` | 主进程目录，入口固定为 `${mainDir}/index.ts` |
| `publicDir` | `public` | Vite 的 `publicDir`，构建时原样拷贝 |
| `libDir` | `lib` | electron-builder 的 `extraFiles`，打包时复制到应用目录 |
| `resourceDir` | `dist/resource` | 渲染进程、主进程、preload 的构建输出目录 |
| `outDir` | `dist/out` | electron-builder 的安装包输出目录 |

```ts
export default defineConfig({
  renderDir: 'render',
  mainDir: 'main',
  publicDir: 'public',
  libDir: 'lib',
  resourceDir: 'dist/resource',
  outDir: 'dist/out',
})
```

::: warning 注意
- 除 `libDir` 外，这些路径都会与项目根目录拼接后使用。
- `renderDir`、`publicDir`、`mainDir` 在 Vite 内部无法直接覆盖：设置 `viteConfig.root`、`viteConfig.publicDir` 或 `packConfig.entry` 不会生效（`packConfig` 本身也只暴露 `external` / `noExternal`）。
- `electronup dev` 会清空 `resourceDir`，`electronup build` 会清空 `resourceDir` 与打包输出目录（配置了 `builderConfig.directories.output` 时清空它，否则清空 `outDir`），请不要把它们指到源码目录。清理前会做安全校验：指向项目根目录及其上级、用户主目录、文件系统根目录、`node_modules` / `.git`，或目录本身是符号链接 / junction 时，会直接报错且不删除任何内容。
:::

## Vite

> 渲染进程构建程序，对应配置项为 `viteConfig`。

`viteConfig` 的类型是 Vite 的 `UserConfig`（去掉了 `publicDir` 与 `ssr`），绝大多数 Vite 配置都可以直接传入。以下几项由 electronup 接管：

| 配置项 | 预置行为 |
| --- | --- |
| `base` | 默认 `./`，**可以覆盖** |
| `build.minify` | 由命令行 `--no-minify` 决定，**不可覆盖** |
| `build.outDir` | 固定为 `resourceDir` 的绝对路径，**不可覆盖** |
| `build.modulePreload` | 默认 `{ polyfill: false }`，可在 `viteConfig.build.modulePreload` 中覆盖 |
| `root` | 固定为 `renderDir`，**不可覆盖** |
| `publicDir` | 固定为 `publicDir` 的绝对路径，**不可覆盖** |

其余配置与 Vite 一致：

```ts
import Vue from '@vitejs/plugin-vue'
import { defineConfig } from 'electronup'

export default defineConfig({
  viteConfig: {
    plugins: [Vue()],
    build: {
      sourcemap: true,
    },
  },
})
```

::: tip 关于环境变量
electronup 会先用 dotenv 读取根目录的 `.env` 与 `.env.{mode}`，再启动 Vite。以 `VITE_` 开头的变量会通过 `import.meta.env` 暴露给渲染进程；主进程与 preload 则可以直接读取全部变量。
:::

## pack

> 主进程构建程序，由 Vite 以 SSR（Node）模式构建，对应配置项为 `packConfig`。

出于稳定性考虑，`packConfig` 只暴露两个字段：

| 配置项 | 类型 | 说明 |
| --- | --- | --- |
| `external` | `(string \| RegExp)[]` | 不参与构建的模块，`electron` 与 Node 内置模块始终不参与 |
| `noExternal` | `(string \| RegExp)[]` | 强制参与构建的模块 |

```ts
export default defineConfig({
  packConfig: {
    external: ['native-module'],
    noExternal: ['some-esm-only-package'],
  },
})
```

预置行为：

| 项 | 值 |
| --- | --- |
| 入口 | `${mainDir}/index.ts`（固定） |
| 输出 | `resourceDir/electron.cjs` |
| 格式 | `cjs`（固定） |
| `build.target` | `node18`（Electron 28 内置的 Node 版本） |
| `build.emptyOutDir` | `false`（`resourceDir` 由 electronup 统一清理） |
| `build.watch` | `dev` 下开启，`build` 下关闭 |
| `minify` | build 跟随命令行（默认开启），dev 不压缩 |
| `sourcemap` | dev 开启，build 关闭 |
| 环境变量 | 自动注入 `.env` / `.env.{mode}`、`NODE_ENV`、`RENDER_PORT`，以 `define` 替换 `process.env.X` 与 `import.meta.env.X` |
| 依赖 | `package.json` 中 `dependencies` / `peerDependencies` / `optionalDependencies` 声明的包不打包（electron-builder 会把它们装进安装包），`devDependencies` 与其他模块打进产物 |

主进程构建不读取项目里的 `vite.config.*`，也不复制 `publicDir`。开发模式下主进程每次构建写盘后都会启动（或重启）Electron，主进程文件变化会触发重新构建。

::: tip 打包依赖
如果你使用了 `electronup` 导出的更新辅助方法，需要同时做两件事（详见 [自动更新](./auto-update.md)）：

1. 把 `electron-updater` 安装到应用的 `dependencies`（它在运行时惰性加载，无法被打进主进程产物，加入 `noExternal` 也不行）；
2. 把 `electronup` 加入 `noExternal`，让更新辅助代码打进主进程产物：

```ts
export default defineConfig({
  packConfig: {
    noExternal: ['electronup'],
  },
})
```
:::

## preload

> 预加载脚本构建配置，对应配置项为 `preload`。可传单个配置对象或配置数组（多入口场景）。

每一项都使用 Vite 以 SSR（Node）模式构建，其中 `entry` 必须提供（不支持 glob 通配符）：

```ts
import { resolve } from 'node:path'
import { defineConfig } from 'electronup'

export default defineConfig({
  preload: {
    entry: { preload: resolve(__dirname, 'preload/index.ts') },
  },
})
```

每项的默认值如下，单项配置中的同名字段会覆盖默认值：

| 项 | 默认值 |
| --- | --- |
| 格式 | `cjs`，输出文件名与入口 key 对应（例如 `preload` → `preload.cjs`）；`format: 'esm'` 时输出 `.mjs` |
| 输出目录 | 与主进程一致（`resourceDir`），也可在单项配置中指定 `outDir`；`outDir` 位于 `resourceDir` 之外时会自动加入默认的 builder `files`（自定义 `files` 时需自行包含），且必须位于项目根目录之内 |
| 环境变量 | 与主进程一致；单项配置中的 `env` 优先 |
| `external` / `noExternal` | 与主进程相同的依赖规则，`electron` 始终不打包；`noExternal: true` 表示其余模块全部打进产物 |
| `minify` / `sourcemap` | 默认 dev 不压缩并生成 sourcemap；build 跟随命令行压缩，不生成 sourcemap |
| `plugins` | Vite 插件，追加在 electronup 内置插件之后 |
| `viteConfig` | 其余 Vite 配置，最后通过 `mergeConfig` 合并，可覆盖上面的预置项 |

`dev` 与 `build` 都会在主进程构建之前完成 preload 构建。开发模式下 preload 同样以 watch 模式构建，修改后会重新构建并重启 Electron；首次构建失败不会阻塞 dev，修复后自动重启。

如果 Electron 版本支持 ESM preload，可以在单项配置中显式传入 `format: 'esm'` 覆盖默认值。

## electron-builder

> 桌面端打包，对应配置项为 `builderConfig`。仅在 `build` 命令中生效。

`builderConfig` 的类型是 electron-builder 的 `Configuration`，预置项如下：

| 配置项 | 预置值 |
| --- | --- |
| `electronVersion` | 自动读取项目内 `electron` 的版本；也可在 `builderConfig` 中提供该字段覆盖（该字段不在 electron-builder 的类型里，必要时请断言类型） |
| `appId` | `com.` + `package.json` 的 `name`（去掉开头的 `@`，非法字符替换为 `.` 并合并连续点；纯非 ASCII 名称回退到 `com.electronup`） |
| `productName` | `package.json` 的 `name` |
| `nsis` | 非一键安装（`oneClick: false`）、当前用户安装（`perMachine: false`）、简体中文、允许选择安装目录、创建桌面与开始菜单快捷方式等 |
| `files` | `${resourceDir}/**/*` |
| `extraFiles` | `[libDir]` |
| `directories.output` | 默认取 `outDir`；配置了 `builderConfig.directories.output` 时以它为准，清理与 `electronup-effective-config.yaml` 也随之使用该目录 |
| `asar` | 显式传入 `--no-asar` 时写入 `false` 并覆盖 `builderConfig.asar`；否则使用 `builderConfig.asar`，未配置时交给 electron-builder 决定 |
| `targets` | 由命令行或交互式向导解析出的平台与架构 |
| `mac.target` | `['dmg', 'zip']`：`dmg` 用于分发安装，`zip` 是 mac 端 electron-updater 更新所需的产物 |

`builderConfig` 中的字段会覆盖同名预置项，因此可以自行设置 `appId`、`productName`、`nsis`、`files` 等：

```ts
export default defineConfig({
  builderConfig: {
    appId: 'com.example.app',
    productName: 'Example',
    nsis: {
      oneClick: true,
    },
    publish: [
      { provider: 'github', owner: 'your-org', repo: 'your-app' },
    ],
  },
})
```

关于平台目标：命令行参数（`--win`、`--mac`、`--linux`、`--dir`）会生成 electron-builder 的 `targets`，优先级高于 `builderConfig` 中对应的目标配置。需要长期固定的目标时，建议直接在 `builderConfig` 的 `win` / `mac` / `linux` 中配置，并避免同时使用对应的命令行参数。

## 签名与公证

electronup 不预置任何签名配置，默认产物未签名；是否签名取决于 electron-builder 的配置与你提供的证书环境（见[项目说明](/introduce/project)的「它不负责什么」）。

因为 `builderConfig` 完整透传 electron-builder 的 `Configuration`，且你的字段会覆盖预置项，所以签名能力都可以通过 `builderConfig` 配置。

> 前置条件：macOS 的签名与公证只能在 macOS 上执行（electronup 已限制 mac 包只能在 macOS 构建）；公证还需要本机具备 Xcode / 命令行工具。

### Windows

推荐使用环境变量，避免把证书提交进仓库：

- `CSC_LINK`：`.pfx` 证书路径或 base64 内容。
- `CSC_KEY_PASSWORD`：证书密码。

也可以写在配置里：

```ts
export default defineConfig({
  builderConfig: {
    win: {
      certificateFile: 'certs/cert.pfx',
      certificatePassword: process.env.CSC_KEY_PASSWORD,
      signingHashAlgorithms: ['sha256'],
    },
  },
})
```

electron-builder 26 还支持两种方式（二者互斥，配置后自动优先走 Azure Trusted Signing）：

- `win.signtoolOptions`：自定义 signtool.exe 参数。
- `win.azureSignOptions`：Azure Trusted Signing 云签名。

### macOS

```ts
export default defineConfig({
  builderConfig: {
    mac: {
      identity: 'Developer ID Application: xxx (TEAMID)',
      hardenedRuntime: true,
      entitlements: 'build/entitlements.mac.plist',
      entitlementsInherit: 'build/entitlements.mac.plist',
    },
  },
})
```

公证由 electron-builder 内置的 [@electron/notarize](https://github.com/electron/notarize) 完成，提供以下任一组环境变量即自动执行（可用 `mac.notarize: false` 关闭）：

- `APPLE_API_KEY` + `APPLE_API_KEY_ID` + `APPLE_API_ISSUER`（推荐）
- `APPLE_ID` + `APPLE_APP_SPECIFIC_PASSWORD` + `APPLE_TEAM_ID`
- `APPLE_KEYCHAIN` + `APPLE_KEYCHAIN_PROFILE`

### 与自动更新的关系

签名会直接影响[自动更新](/introduce/auto-update)：

- macOS 自动更新要求应用已签名并公证，且更新包为 `zip`（`mac.target` 已默认包含 `zip`），否则更新会被系统拒绝。
- Windows 端 `win.verifyUpdateCodeSignature` 默认为 `true`，会依据 `publisherName` 校验更新包签名，正式发布建议签名。

## 环境变量

electronup 使用 dotenv 读取项目根目录下的两层文件：

```text
.env
.env.{mode}
```

| 模式 | 文件 |
| --- | --- |
| `development`（dev 默认） | `.env` + `.env.development` |
| `production`（build 默认） | `.env` + `.env.production` |
| 自定义 | `.env` + `.env.{mode}` |

规则：

- 后加载的 `.env.{mode}` 会覆盖 `.env` 中的同名变量。
- `.env` 或 `.env.{mode}` 文件不存在时不会报错，只是不加载该层。
- `NODE_ENV` 由 electronup 写入：`dev` 为 `development`，`build` 为 `production`。
- `dev` 模式下额外注入 `RENDER_PORT`，值为 Vite 实际监听的端口。
- 渲染进程只能读取 `VITE_` 前缀的变量（`import.meta.env`），主进程与 preload 可以读取全部变量（`process.env`）。渲染进程同样从项目根读取 `.env` 文件，`import.meta.env.MODE` 跟随 `-m`。
- 主进程与 preload 的变量在构建时以 `process.env.X` 的形式内联，全局 `process` 与 `import process from 'node:process'`（或 `'process'`）两种写法都支持；`import { env } from 'node:process'` 或其他本地名（如 `import proc from 'node:process'`）不会被内联。
- 主进程与 preload 不读取 `.env.local` 等更细的层级；渲染进程的变量由 Vite 加载，遵循 Vite 的规则（包括 `.env.local`）。

## 实际生效配置

每次 `electronup build` 结束后，electronup 会把最终解析出的配置写入打包输出目录（`builderConfig.directories.output`，未配置时为 `outDir`）：

```text
${outDir}/electronup-effective-config.yaml
```

该文件仅用于排查，写入失败只会打印告警，不影响构建结果与退出码。

`electronup build --web` 只构建渲染进程，不会生成该文件，并会删除上一次打包留下的该文件，避免读到与当前产物不符的配置。

它包含合并后的 `vite`、`pack`、`preload` 与 `builder` 配置（在 electron-builder 执行前快照），适合用来确认某个配置项是否生效。文件头记录了 electronup 版本、生成时间与命令；`plugins` 只保留插件名称，函数显示为 `[Function name]`，正则显示为字面量，`builder.targets` 显示为平台 / 架构名称。它并非完整的运行时配置，且可能包含绝对路径，仅建议用于排查问题。

## 完整示例

```ts
import { resolve } from 'node:path'
import Vue from '@vitejs/plugin-vue'
import { defineConfig } from 'electronup'

export default defineConfig(({ command }) => ({
  renderDir: 'render',
  mainDir: 'main',
  publicDir: 'public',
  resourceDir: 'dist/resource',
  outDir: 'dist/out',

  viteConfig: {
    plugins: [Vue()],
    build: {
      sourcemap: command === 'serve',
    },
  },

  packConfig: {
    external: ['better-sqlite3'],
    noExternal: ['electronup'],
  },

  preload: {
    entry: { preload: resolve(__dirname, 'preload/index.ts') },
  },

  builderConfig: {
    appId: 'com.example.app',
    productName: 'Example',
    publish: [
      { provider: 'github', owner: 'your-org', repo: 'your-app' },
    ],
  },
}))
```
