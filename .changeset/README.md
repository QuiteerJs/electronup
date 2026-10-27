# Changesets

本目录存放待发布的变更说明, 由 [changesets](https://github.com/changesets/changesets) 管理。

## 什么时候需要

改动会影响某个包的使用者 (新功能、修复、破坏性变更) 时, 在 PR 里附带一个 changeset;
只改测试、CI、文档或 playground 时不需要。

## 怎么写

```bash
pnpm changeset
```

按提示选择受影响的包和版本级别 (patch / minor / major), 再写一段给使用者看的说明,
会在本目录生成一个 `.md` 文件, 随 PR 一起提交即可。

## 之后发生什么

changesets 只管 `@quiteer/electron-*` 模块包; electronup 与 create-electronup 仍按 bumpp 流程发版。

1. 准备发版时在根目录运行 `pnpm version:modules` (即 `changeset version`), 汇总所有 changeset:
   升版本号、写各包 CHANGELOG, 并删除已消费的 changeset。审阅后提交并合入 main。
2. 为每个升了版本的包在 main 上打注解标签, 标签去掉 `@quiteer/` scope, 如 `electron-ipc-v3.2.0`。
3. 逐个推送标签, 由 `.github/workflows/release.yml` 发布到 npm。
   一次推送超过三个标签时 GitHub 不会触发 workflow, 所以不要 `git push --tags`。

详细步骤见 [.github/RELEASING.md](../.github/RELEASING.md)。
