# 发布流程

固定分为准备与上传两步：agent 完成版本、检查与提交，合入 main；维护者推送版本标签后，由 `.github/workflows/release.yml` 自动发布到 npm（也可以在包目录手动 `pnpm publish`）。不再提供将这些动作串联的 `release` 命令。

## 两条流程各管哪些包

| 包 | 升版 | CHANGELOG | 标签 |
| --- | --- | --- | --- |
| `electronup` | `pnpm version:core`（bumpp） | `pnpm changelog`（`qui cl`，按提交生成到根目录 CHANGELOG） | `electronup-v<版本>` |
| `create-electronup` | `pnpm version:scaffold`（bumpp） | 同上 | `create-electronup-v<版本>` |
| `@quiteer/electron-*` | `pnpm version:modules`（changesets） | changesets 写入各包自己的 `CHANGELOG.md` | `electron-<模块>-v<版本>` |

下面第 1 到 4 节是核心包流程，模块包见最后一节。两条流程互不影响：`.changeset/config.json` 忽略了 electronup 与 create-electronup，`qui cl` 也不要用来生成模块包的 CHANGELOG。

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

## 4. 发布

### 自动发布（推荐）

推送 `electronup-v<版本>` 或 `create-electronup-v<版本>` 标签后，Release workflow 会：

1. 校验标签与包版本一致、标签提交已在 main 上；
2. 执行 typecheck、lint、单元测试；
3. 用 `pnpm pack` 打包（替换 `catalog:` / `workspace:` 协议并应用 `publishConfig`），检查 tarball；
4. 通过 npm Trusted Publishing（OIDC）发布到官方注册表，并附带 provenance。

不需要 `NPM_TOKEN`，也不需要本地 2FA。首次使用前，维护者需要在 npmjs.com 上为两个包分别登记 Trusted Publisher：包页面 → Settings → Trusted Publisher → GitHub Actions，Organization 或 user 填 `QuiteerJs`，Repository 填 `electronup`，Workflow filename 填 `release.yml`，Environment 留空。

标签只能推送一次：发布失败时先看 workflow 日志，修复后删除远端与本地标签再重新推送，不要直接改版本号重试。

### 手动发布

核心包在 `packages/electronup` 目录执行：

```bash
pnpm publish
```

脚手架在 `packages/create-electronup` 执行同一命令。不要在仓库根目录执行，该目录是 private monorepo。

prepublishOnly 自动校验 main/master、干净工作区及当前版本标签指向 HEAD，然后重新构建；不升版、不生成 CHANGELOG、不提交、不推送。npm 登录及 2FA 由用户完成。

上传后查询官方注册表确认版本和 latest 标签。如果认证失败，只修复登录后重试 publish；如果版本已存在，先核实是否已成功发布，不得盲目重新升版。

## 模块包（@quiteer/electron-*）

`packages/electron-*` 的 7 个模块包用 changesets 管理版本与 CHANGELOG，不走 bumpp 与 `pnpm changelog`。

1. 改动影响使用者时，在 PR 里附带 `pnpm changeset` 生成的说明。
2. 发版时在根目录运行 `pnpm version:modules`，审阅版本号与各包 CHANGELOG 后提交，合入 main。
3. 发版前查询官方注册表，确认目标版本未被使用：

   ```bash
   pnpm view @quiteer/electron-ipc versions --json --registry=https://registry.npmjs.org/
   ```

4. 在 main 上为每个升版的包创建注解标签，标签名去掉 `@quiteer/` scope：

   ```bash
   git tag -a electron-ipc-v<新版本> -m "chore(release): 发布 @quiteer/electron-ipc v<新版本>"
   git push origin electron-ipc-v<新版本>
   ```

   **逐个推送标签**：一次推送超过三个标签时 GitHub 不会为它们触发 workflow。

5. Release workflow 按标签找到 `packages/electron-<模块>`，跑与核心包相同的检查后经 Trusted Publishing 发布。

每个模块包都要在 npmjs.com 单独登记 Trusted Publisher（填写方式同上，Workflow filename 为 `release.yml`）。尚未在 npm 上存在的包无法提前登记，首个版本需要维护者在包目录手动 `pnpm publish` 一次，之后再登记。

