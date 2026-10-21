import type { CliOptions, Configuration } from 'electron-builder'
import type { BuilderConfig, ElectronupConfig } from '../typings/electronup'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import fsExtra from 'fs-extra'
import { DefaultDirs, store } from '../utils'

/**
 * 根据项目名生成一个默认 appId , 避免所有项目共用 org.quiteer.electronup
 *
 * - scoped 包名 @scope/name : 去掉开头的 @ , 斜杠等非法字符替换为点 , 得到 com.scope.name
 * - 空格 / 中文等非法字符 : 替换为点后合并连续的点并去掉首尾点
 * - 归一化后为空 ( 例如纯中文包名 ) : 回退到 com.electronup
 */
function defaultAppId(pkgName: string): string {
  const safe = pkgName
    .replace(/^@/, '')
    .replace(/[^a-zA-Z0-9_.-]/g, '.')
    .replace(/\.{2,}/g, '.')
    .replace(/^\.+|\.+$/g, '')

  return safe ? `com.${safe}` : 'com.electronup'
}

export async function getBuilderConfig(config: BuilderConfig, allConfig: ElectronupConfig): Promise<CliOptions> {
  const { readJSON } = fsExtra
  const packages = await readJSON(resolve(store.root, 'package.json'))

  // pnpm 严格隔离下 electronup 包内解析不到 electron , 从用户项目根解析 ( electron 为 peer 依赖 )
  const { electronVersion: userElectronVersion, ...restConfig } = config as BuilderConfig & { electronVersion?: string }
  const electronVersion = userElectronVersion || getProjectElectronVersion()

  const nsis: NonNullable<Configuration['nsis']> = {
    oneClick: false,
    language: '2052',
    perMachine: false,
    allowElevation: true,
    allowToChangeInstallationDirectory: true,
    runAfterFinish: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    artifactName: `${packages.name} \${arch} Setup ${packages.version}.\${ext}`,
  }

  // mac 端 electron-updater 依赖 zip 更新包 , dmg 用于分发安装
  const mac: NonNullable<Configuration['mac']> = {
    target: ['dmg', 'zip'],
  }

  const defaultConfig: CliOptions['config'] = {
    electronVersion,
    appId: defaultAppId(packages.name),
    productName: packages.name,
    files: [`${allConfig.resourceDir || DefaultDirs.resourceDir}/**/*`],
    extraFiles: [allConfig.libDir || DefaultDirs.libDir],
    // CLI 未传 --no-asar 时 store.asar 为 undefined , 不覆盖 builder 默认值
    ...(store.asar !== undefined ? { asar: store.asar } : {}),
    ...restConfig,
    // 嵌套预置项做一层浅合并 : builderConfig 中同名字段覆盖预置字段 ,
    // 未覆盖的预置字段 ( 如 mac 默认 dmg + zip 、nsis 预置项 ) 保留
    nsis: { ...nsis, ...restConfig.nsis },
    mac: { ...mac, ...restConfig.mac },
    directories: {
      output: allConfig.outDir || DefaultDirs.outDir,
      ...restConfig.directories,
    },
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
