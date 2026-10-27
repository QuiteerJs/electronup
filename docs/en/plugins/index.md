---
title: Overview
---

# {{ $frontmatter.title }}

electronup itself only orchestrates the build. The packages below are installed on demand to create projects or add runtime capabilities.

## Build related

- [create-electronup](https://github.com/QuiteerJs/electronup/tree/main/packages/create-electronup): CLI that creates electronup project templates (`vanilla`, `vue`, `react`, `react-swc`, `solid`).
- [@quiteer/parser-config](https://github.com/QuiteerJs/parser-config): resolves user config files by path; electronup uses it to read `electronup.config.ts` and friends.

## Runtime related

The seven packages below are maintained under `packages/electron-*` in this repository and work alongside electronup. Install only what you need:

- [@quiteer/electron-ipc](https://github.com/QuiteerJs/electronup/tree/main/packages/electron-ipc): preset IPC channels for the main process; one `init()` call lets the renderer control its own window and call `node:path` helpers.
- [@quiteer/electron-preload](https://github.com/QuiteerJs/electronup/tree/main/packages/electron-preload): preload script; import it to get the path and expose the curated `$ipc` / `$clipboard` / `$webFrame` APIs.
- [@quiteer/electron-browser](https://github.com/QuiteerJs/electronup/tree/main/packages/electron-browser): window management with central registration, lookups anywhere and reactive properties.
- [@quiteer/electron-menu](https://github.com/QuiteerJs/electronup/tree/main/packages/electron-menu): menu management with central registration, path-based lookups and automatic syncing.
- [@quiteer/electron-tray](https://github.com/QuiteerJs/electronup/tree/main/packages/electron-tray): tray management with central registration, icon states, menus and events.
- [@quiteer/electron-app](https://github.com/QuiteerJs/electronup/tree/main/packages/electron-app): app lifecycle boilerplate with single instance lock, deep links, macOS `activate` window recreation and graceful quit.
- [@quiteer/electron-shortcut](https://github.com/QuiteerJs/electronup/tree/main/packages/electron-shortcut): global shortcut management with named registration, conflict detection, focus-based enabling and automatic unregistering on quit.

Upgrading electron-preload / electron-ipc from an older version? See the [migration guide](./migration).

These runtime packages do not depend on the electronup CLI and do not affect build output paths. Import them from your own main process entry as needed.
