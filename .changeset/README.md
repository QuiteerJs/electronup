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

1. PR 合并到 main 后, Release 工作流会自动开一个 "Version Packages" PR,
   汇总所有 changeset: 升版本号、写 CHANGELOG。
2. 合并这个 PR 即发布到 npm (Trusted Publishing, 自带 provenance), 并打 tag、建 GitHub Release。
