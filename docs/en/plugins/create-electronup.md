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

Use `.` to scaffold into the current directory. If the directory is not empty, the CLI asks before clearing it (`.git` is kept).

## Templates

| Template | Description |
| --- | --- |
| `vanilla` | Vanilla TypeScript + Vite |
| `vue` | Vue 3 |
| `react` | React + TypeScript |
| `react-swc` | React + TypeScript + SWC |
| `solid` | Solid |

Choosing `react` triggers a follow-up question about the TypeScript or SWC variant.

## Template source

Templates are not bundled; they are fetched on demand with [degit](https://github.com/Rich-Harris/degit):

```text
https://github.com/QuiteerJs/electronup-template.git#<template>
```

GitHub access is required when creating a project.

## After creation

The CLI only fetches the template; it does not install dependencies. Follow the printed instructions:

```bash
cd my-app
pnpm install
pnpm dev
```
