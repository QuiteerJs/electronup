# GitHub Copilot instructions — electronup

electronup is an Electron build tool that fuses **Vite** (renderer), **vite-plus pack** (main process / preload) and **electron-builder** (packaging) behind one `electronup.config.ts`. The repo is a pnpm monorepo. Read `AGENTS.md` at the repository root for the full guide.

## Workspace layout

- `packages/electronup` — core package: CLI (`src/cli.ts`), config resolution (`src/transform`), dev/build runners (`src/runner`), preset configs (`src/configs`), optional auto-updater (`src/updater.ts`).
- `packages/create-electronup` — project scaffolder (giget templates, `--mirror` for GitHub mirrors).
- `playground/electronup-test` — end-to-end example used by CI smoke builds.
- `docs/` — VitePress site, Chinese at root and English under `docs/en/` (17 pages each).
- `.github/workflows/smoke-build.yml` — cross-platform `build --dir` smoke build plus a Windows self-signed code-signing smoke job.

## Commands

```bash
pnpm install
pnpm test                       # vitest 5, tests colocated as src/**/*.test.ts
pnpm typecheck                  # tsc -p packages/electronup/tsconfig.json
pnpm lint                       # oxlint (Markdown is not linted)
pnpm --filter electronup build  # vp pack -> dist/client + dist/bin
pnpm docs:build
```

End-to-end after building the CLI: inside `playground/electronup-test` run `node ../../packages/electronup/dist/bin/electronup.mjs build --web` (renderer only) or `build --dir` (main + preload + electron-builder).

## Conventions

- Commit messages: Conventional Commits with a Chinese subject, e.g. `fix(build): 修正 xxx`.
- Style: no semicolons, single quotes, 2-space indent, LF, single-line `if (x) { return }`. `no-console` allows only `console.error`.
- Add or update a colocated `*.test.ts` when changing behavior; mock IO boundaries (`fs-extra`, `node:module`), never launch Electron in tests.
- Never commit `dist/`, `docs/.vitepress/{cache,dist}`, `*.tgz` or temporary/log files.

## Pitfalls that have caused regressions

1. `src/updater.ts` must stay lazily loaded — no top-level `electron` / `electron-updater` import or `autoUpdater` property access; config files are evaluated in plain Node.
2. cac parses negated options (`--no-minify`, `--no-asar`) as `true` when omitted; normalize in `src/cli.ts` (`minify !== false`, `asar === false ? false : undefined`).
3. Main-process and preload output are CJS (`electron.cjs`, `preload*.cjs`); keep `playground/electronup-test/package.json#main` pointing at `dist/resource/electron.cjs`.
4. `electron` is an optional peer dependency resolved from the user project root via `createRequire`; do not add it to `dependencies`.
5. preset electron-builder values (dynamic `appId`, `mac.target = ['dmg', 'zip']`, `nsis.perMachine = false`, no default deeplink protocols, shallow-merged `nsis`/`mac`/`directories`) are intentional.
6. Missing `.env` / `.env.{mode}` files must degrade to `{}` instead of throwing.
7. Docs must be kept in sync between `docs/` and `docs/en/`, including both locale sidebars in `docs/.vitepress/config.ts`.
