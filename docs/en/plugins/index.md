---
title: Overview
---

# {{ $frontmatter.title }}

electronup itself only orchestrates the build. The packages below are installed on demand to create projects or add runtime capabilities.

## Build related

- [create-electronup](https://github.com/QuiteerJs/electronup/tree/main/packages/create-electronup): CLI that creates electronup project templates (`vanilla`, `vue`, `react`, `react-swc`, `solid`).
- [@quiteer/parser-config](https://github.com/QuiteerJs/parser-config): resolves user config files by path; electronup uses it to read `electronup.config.ts` and friends.

## Runtime related

The five packages below are maintained in [electron-modules](https://github.com/QuiteerJs/electron-modules) and work alongside electronup. Install only what you need:

- [@quiteer/electron-ipc](https://github.com/QuiteerJs/electron-modules/tree/main/packages/ipc): preset IPC channels for the main process; one `init()` call lets the renderer control its own window and call `node:path` helpers.
- [@quiteer/electron-preload](https://github.com/QuiteerJs/electron-modules/tree/main/packages/preload): preload script; import it to get the path and expose the curated `$ipc` / `$clipboard` / `$webFrame` APIs.
- [@quiteer/electron-browser](https://github.com/QuiteerJs/electron-modules/tree/main/packages/browser): window management with central registration, lookups anywhere and reactive properties.
- [@quiteer/electron-menu](https://github.com/QuiteerJs/electron-modules/tree/main/packages/menu): menu management with central registration, path-based lookups and automatic syncing.
- [@quiteer/electron-tray](https://github.com/QuiteerJs/electron-modules/tree/main/packages/tray): tray management with central registration, icon states, menus and events.

These runtime packages do not depend on the electronup CLI and do not affect build output paths. Import them from your own main process entry as needed.
