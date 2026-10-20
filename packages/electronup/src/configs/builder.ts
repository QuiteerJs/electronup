import type { CliOptions } from 'electron-builder'
import type { BuilderConfig, ElectronupConfig } from '../typings/electronup'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import fsExtra from 'fs-extra'
import { DefaultDirs, store } from '../utils'

/**
 *  CliOptions 配置直接
 */

// const allTargetFormats = ['7z', 'zip', 'tar.xz', 'tar.lz', 'tar.gz', 'tar.bz2', 'dir']

// const winTargetFormats = ['nsis', 'nsis-web', 'portable', 'AppX', ...allTargetFormats]
// const winTargets = Platform.WINDOWS.createTarget(winTargetFormats, Arch.ia32, Arch.x64)

// const macTargetFormats = ['dmg', 'pkg', 'mas', 'mas-dev', ...allTargetFormats]
// const macTargets = Platform.MAC.createTarget(macTargetFormats, Arch.arm64, Arch.x64, Arch.universal)

// const linuxTargetFormats = ['AppImage', 'snap', 'debian', 'rpm', 'freebsd', 'pacman', 'p5p', 'apk', ...allTargetFormats]
// const linuxTargets = Platform.LINUX.createTarget(linuxTargetFormats, Arch.armv7l, Arch.arm64, Arch.x64)

export async function getBuilderConfig(config: BuilderConfig, allConfig: ElectronupConfig): Promise<CliOptions> {
  const { readJSON } = fsExtra
  const packages = await readJSON(resolve(store.root, 'package.json'))

  // pnpm 严格隔离下 electronup 包内解析不到 electron , 从用户项目根解析 ( electron 为 peer 依赖 )
  const { electronVersion: userElectronVersion, ...restConfig } = config as BuilderConfig & { electronVersion?: string }
  const electronVersion = userElectronVersion || getProjectElectronVersion()

  const defaultConfig: CliOptions['config'] = {
    electronVersion,
    asar: store.asar,
    appId: 'org.quiteer.electronup',
    productName: packages.name,
    protocols: {
      name: packages.name,
      schemes: ['deeplink'],
    },
    nsis: {
      oneClick: false,
      language: '2052',
      perMachine: true,
      allowElevation: true,
      allowToChangeInstallationDirectory: true,
      runAfterFinish: true,
      createDesktopShortcut: true,
      createStartMenuShortcut: true,
      artifactName: `${packages.name} \${arch} Setup ${packages.version}.\${ext}`,
    },
    files: [`${allConfig.resourceDir || DefaultDirs.resourceDir}/**/*`],
    extraFiles: [allConfig.libDir || DefaultDirs.libDir],
    directories: {
      output: allConfig.outDir || restConfig.directories?.output || DefaultDirs.outDir,
    },
    ...restConfig,
  }

  return { targets: store.targets, config: defaultConfig }
}

function getProjectElectronVersion(): string | undefined {
  try {
    const requireFromRoot = createRequire(resolve(store.root, 'package.json'))
    return (requireFromRoot('electron/package.json') as { version: string }).version
  }
  catch {
    return undefined
  }
}
