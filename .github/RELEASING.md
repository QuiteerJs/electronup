# 发布流程

固定分为准备与上传两步：agent 完成版本、检查、提交、标签和 CI；用户最后在包目录运行 `pnpm publish`。不再提供将这些动作串联的 `release` 命令。

## 1. 确定版本

在仓库根目录查询官方注册表，确认新版本未被使用：

```bash
pnpm view electronup version versions --json --registry=https://registry.npmjs.org/
pnpm version:core --release <新版本> --yes
```

脚手架独立发版，用 `pnpm version:scaffold --release <新版本> --yes`。命令通过 bumpp 修改指定包的 package.json，不自动提交、打标签或推送。必须检查实际文件版本与 diff，不能仅看命令成功或提交标题。不要手工修改版本。

旧 `qui r` 在 Windows 将反斜杠绝对路径交给 bumpp，可能匹配不到文件却创建空版本提交。本流程使用仓库相对路径。失败后先检查 package.json、Git 标签和 npm 版本，避免重复升版。

## 2. 验收与提交

使用 .node-version 与 packageManager 指定的版本。在根目录执行：

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm --filter create-electronup typecheck
pnpm test
pnpm work:build
pnpm docs:build
```

构建或更新器变更还需验收 playground 的 Web、目录包与 Windows NSIS 更新元数据。真实安装、下载更新和重启验收参见自动更新文档，构建成功不能替代真实升级。

审阅 git diff，只提交本次变更。先提交代码与版本，再运行 `pnpm changelog`，审阅并提交生成的 CHANGELOG。不要手工维护 CHANGELOG。原有本地缓存与个人记录保留在本地，可通过 .git/info/exclude 排除。

## 3. 主分支、标签与真实 tarball

将上述提交合入 main；能快进时使用 `git merge --ff-only <准备分支>`，不能快进时先处理差异，不强推。工作区应干净。

重新构建待发布包，在已忽略的 template 下创建一个新的空验收目录：

```bash
pnpm --filter electronup build
pnpm --filter electronup pack --pack-destination <归档目录绝对路径>
tar -xf <归档目录>/electronup-<新版本>.tgz -C <空解压目录>
node .github/scripts/check-release-package.mjs <解压目录>/package
```

确认 tarball 版本与源码一致，独立消费项目安装、CLI 与构建验证通过。脚手架使用对应包名，并补充模板拉取验证。

在包含版本和 CHANGELOG 的最终提交创建注解标签，再推送主分支与本次标签：

```bash
git tag -a electronup-v<新版本> -m "chore(release): 发布 electronup v<新版本>"
git push origin main
git push origin electronup-v<新版本>
```

核对相同提交的 Smoke Build（三平台与 Windows 签名）通过；失败先修复，不能把旧提交的通过记录当作本次结果。未完成的真实升级验证必须明确记录。

## 4. 用户上传

核心包在 `packages/electronup` 目录执行：

```bash
pnpm publish
```

脚手架在 `packages/create-electronup` 执行同一命令。不要在仓库根目录执行，该目录是 private monorepo。

prepublishOnly 自动校验 main/master、干净工作区及当前版本标签指向 HEAD，然后重新构建；不升版、不生成 CHANGELOG、不提交、不推送。npm 登录及 2FA 由用户完成。

上传后查询官方注册表确认版本和 latest 标签。如果认证失败，只修复登录后重试 publish；如果版本已存在，先核实是否已成功发布，不得盲目重新升版。
