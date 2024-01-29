import { resolve } from 'path'
import type { CliOptions } from 'electron-builder'
import { readJSON } from 'fs-extra'
import type { BuilderConfig, ElectronupConfig } from '../typings/electronup'
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
  const packages = await readJSON(resolve(store.root, 'package.json'))

  const defaultConfig: CliOptions['config'] = {
    asar: store.asar,
    appId: 'org.quiteer.electronup',
    productName: packages.name,
    protocols: {
      name: packages.name,
      schemes: ['deeplink']
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
      artifactName: `${packages.name} \${arch} Setup ${packages.version}.\${ext}`
    },
    files: [`${allConfig.resourceDir || DefaultDirs.resourceDir}/**/*`],
    extraFiles: [allConfig.libDir || DefaultDirs.libDir],
    directories: {
      output: allConfig.outDir || config.directories?.output || DefaultDirs.outDir
    },
    ...config
  }

  return { targets: store.targets, config: defaultConfig }
}

