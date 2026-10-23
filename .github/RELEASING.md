# 发版准备

准备检查不会修改版本、生成 CHANGELOG、提交、打标签或发布。版本与 CHANGELOG 由各包的 `release` 脚本生成。

## 环境与检查

- 使用 `.node-version` 指定的 Node.js；核心包支持 `^22.18.0 || ^24.11.0 || >=26.0.0`，与 vite-plus 一致。
- 使用 `packageManager` 指定的 pnpm 10.30.3。
- 检查 `git status --short`，仅纳入本次发布需要的文件；不要把本地记录、缓存、安装包和验收日志提交。

在仓库根目录执行：

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm --filter create-electronup typecheck
pnpm test
pnpm work:build
pnpm docs:build
```

涉及构建或更新器时还应执行 playground 的 `build --web`、`build --dir` 和 Windows NSIS 更新产物检查，并等待 Smoke Build 的三个平台及 Windows 签名任务通过。该工作流使用最低支持的 Node 22.18.0，并检查核心包 tarball。更新器的真实安装、下载、退出安装与重启验收见 [自动更新文档](../docs/introduce/auto-update.md#仓库示例与升级验收)；构建成功不代表真实升级已通过。

## 发布包检查

使用一个新的临时目录保存 tarball，例如仓库已忽略的 `template/release-check`，并取得它的绝对路径。以下解压命令需要 `tar`；重复检查时应另建空目录，避免旧文件影响结果。

```bash
pnpm --filter electronup pack --pack-destination <临时目录绝对路径>
pnpm --filter create-electronup pack --pack-destination <临时目录绝对路径>
```

`--pack-destination` 请使用绝对路径，避免被包目录解析。为两个包各建一个空解压目录，然后将实际版本号代入以下命令：

```bash
tar -xf <临时目录>/electronup-<版本>.tgz -C <核心包解压目录>
tar -xf <临时目录>/create-electronup-<版本>.tgz -C <脚手架解压目录>
node .github/scripts/check-release-package.mjs <核心包解压目录>/package
node .github/scripts/check-release-package.mjs <脚手架解压目录>/package
```

检查脚本验证文件白名单、bin / exports / 类型入口、依赖协议转换、Node 要求、Electron 可选 peer，以及核心包的 ESM / CJS 惰性导入。脚手架还需在可联网环境实际拉取目标模板；检查文件本身不代表模板拉取成功。

另外应在独立消费项目中安装 tarball，验证 `electronup --help`、`electronup build --help`、`electronup --version` 和项目构建。独立安装受限时，必须记录未验证项，不能用 workspace 内的成功结果代替。

## 正式发布前

1. 提交并审阅待发布变更，确认远端 CI 对应同一提交；工作区保持干净。
2. 查询官方 npm 注册表的版本和标签，确认目标版本未使用。核心包与脚手架独立版本，不必同步发版。
3. 确认 npm 账户、包权限与发布认证可用；不要在日志中打印 token。
4. 审阅发布工具将生成的版本和 CHANGELOG；不要手动维护 `CHANGELOG*`。

下面的命令会进入真实发版流程，包含版本生成、构建及 npm 发布，只在明确决定发版时执行：

```bash
pnpm --filter electronup release
# 仅在脚手架也需要发布时执行
pnpm --filter create-electronup release
```

在仓库根目录运行核心包命令。当前 `qui r` 会列出整个仓库的包，发布核心包时只选择 `electronup (packages/electronup/package.json)`；不要同时选择脚手架、playground 或 template。确认新版本未占用，再完成版本和提交信息交互。不要以“未选择任何包”的方式跳过升版：当前工具会正常返回，后面的构建与发布仍会继续。

当前 `@quiteer/scripts 0.1.6` 在生成 CHANGELOG 后执行 `git add -A`，因此执行前必须检查未跟踪文件。本机缓存和个人记录可加入 `.git/info/exclude`，不要靠临时文件“未跟踪”来阻止它们进入发布提交。

`qui r` 会创建版本提交和标签，然后生成 CHANGELOG 并交互提交；它不会推送这些 Git 变更。npm 发布成功后，在当前分支执行 `git push`，再用 `git push origin electronup-v<实际版本>` 只推送本次标签。

发布后从官方注册表核对版本和 dist-tag，并在新的消费项目中验证正式发布包。不要直接上传仍使用旧版本号的预检 tarball。
