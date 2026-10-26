---
title: create-electronup
---

# {{ $frontmatter.title }}

> Creates a project template powered by [electronup](https://github.com/QuiteerJs/electronup).

Templates: `vanilla`, `vue`, `react`, `react-swc` and `solid`, each mapped to a branch of [electronup-template](https://github.com/QuiteerJs/electronup-template).

## Create a project

```bash
pnpm create electronup
```

Or with npm:

```bash
npm create electronup@latest
```

Project name and template can be passed directly:

```bash
pnpm create electronup my-app --template vue
```

`-t` is the short form of `--template`. Without a project name, the CLI asks:

```text
? Project name: » electronup-project
```

Use `.` to scaffold into the current directory. If the directory is not empty, the CLI asks before clearing it (`.git` is kept); pass `--overwrite` to clear it without asking.

After fetching, the CLI rewrites `name` in `package.json` to the project directory name (normalized when it is not a valid package name, e.g. `My App` → `my-app`). electron-builder derives the default `appId` from it, so projects no longer share one `appId`.

## CLI options

| Option | Description |
| --- | --- |
| `[project dir]` | Project directory; asked for when omitted |
| `-t, --template <template>` | Use the given template and skip selection |
| `--overwrite` | Clear a non-empty target directory without asking (`.git` is kept) |
| `-h, --help` | Show help |

The process exits with code `1` when cancelled or when fetching the template fails.

## Templates

| Template | Description |
| --- | --- |
| `vanilla` | Vanilla TypeScript + Vite |
| `vue` | Vue 3 |
| `react` | React + TypeScript |
| `react-swc` | React + TypeScript + SWC |
| `solid` | Solid |

Choosing `react` interactively triggers a follow-up question about the TypeScript or SWC variant; passing `-t react` or `-t react-swc` skips it.

## Template source

Templates are not bundled; they are fetched on demand with [degit](https://github.com/Rich-Harris/degit):

```text
https://github.com/QuiteerJs/electronup-template.git#<template>
```

GitHub access is required when creating a project. If fetching fails, the CLI prints the matching `git clone` command so you can clone the branch manually.

## After creation

The CLI only fetches the template; it does not install dependencies. Templates pin pnpm through the `packageManager` field and `pnpm-lock.yaml`, so the CLI always suggests pnpm, whichever package manager ran it (run `corepack enable` if pnpm is not installed):

```bash
cd my-app
pnpm install
pnpm dev
```
