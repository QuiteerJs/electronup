---
name: electronup-release
description: 为 electronup 或 create-electronup 准备一次 npm 发布（选版本、升版、验收、changelog、合入 main、打标签、校验 tarball），最后由用户执行 pnpm publish。维护者要发版、升版本号、生成 CHANGELOG 或打 release 标签时使用。
---

# 准备 electronup 发布

固定流程：**agent 准备，用户发布**。没有用户明确授权，不得执行 `pnpm publish` / `npm publish`；不要使用 `qui r` 或任何把升版、构建、上传串在一起的脚本。完整说明见 `.github/RELEASING.md`，与本文冲突时以它为准。

| 包 | 目录 | 升版命令 | 标签 |
| --- | --- | --- | --- |
| `electronup` | `packages/electronup` | `pnpm version:core --release <版本> --yes` | `electronup-v<版本>` |
| `create-electronup` | `packages/create-electronup` | `pnpm version:scaffold --release <版本> --yes` | `create-electronup-v<版本>` |

## 1. 选版本

```bash
pnpm view electronup version versions --json --registry=https://registry.npmjs.org/
```

选一个注册表中**未使用**的版本，向用户确认后再升版。

## 2. 升版并核对文件

在仓库根目录执行上表命令（bumpp，不提交、不打标签、不推送）。然后**读取目标 package.json 确认 `version` 已变**并看 `git diff`；不能以命令成功或日志代替。禁止手改 version。失败时先核对 package.json、git 标签和注册表，不要盲目重跑。

## 3. 验收

```bash
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm work:build
pnpm docs:build
```

涉及构建或更新器时，再在 `playground/electronup-test` 用 `node ../../packages/electronup/dist/bin/electronup.mjs build --web` 与 `build --dir` 验收。真实安装与升级验收未做时要在结果中明确写出。

## 4. 提交与 CHANGELOG

1. 审阅 diff，只提交本次变更：`chore(release): 发布 electronup v<版本>` 一类的 `type(scope): 中文描述`。
2. 运行 `pnpm changelog` 生成 CHANGELOG，审阅后**单独提交**。不要手工编辑 CHANGELOG。
3. `git status` 必须干净；本机缓存放进 `.git/info/exclude`，不要顺手删除或提交。

## 5. 合入 main 与打标签

- main 有分支保护：通过 PR 合入，能快进时用 `--ff-only`，不强推。
- 在包含版本与 CHANGELOG 的最终 main 提交上打注解标签并推送：

```bash
git tag -a electronup-v<版本> -m "chore(release): 发布 electronup v<版本>"
git push origin electronup-v<版本>
```

## 6. 校验真实 tarball

```bash
pnpm --filter electronup build
pnpm --filter electronup pack --pack-destination <临时目录绝对路径>
tar -xf <临时目录>/electronup-<版本>.tgz -C <空解压目录>
node .github/scripts/check-release-package.mjs <空解压目录>/package
```

确认 tarball 只含 `dist`、README、LICENSE、package.json，且 tarball 版本、源码版本、标签三者一致。临时目录放在被忽略的 `template/` 下或仓库之外，不要提交 `*.tgz`。核对同一提交的 Smoke Build（三平台 + Windows 签名）通过，不能拿旧提交的结果代替。

## 7. 交给用户

告诉用户在**包目录**（不是仓库根，根是 private）执行：

```bash
cd packages/electronup
pnpm publish
```

`prepublishOnly` 会校验 main/master、干净工作区、当前版本标签指向 HEAD 并重新构建。npm 登录与 2FA 由用户完成。发布后用 `pnpm view electronup version dist-tags --registry=https://registry.npmjs.org/` 确认版本与 latest；若提示版本已存在，先核实是否已发布成功，不要重新升版。
