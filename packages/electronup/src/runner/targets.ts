import type { Arch, Platform } from 'electron-builder'
import process from 'node:process'
import { Arch as ArchEnum, Platform as PlatformEnum } from 'electron-builder'

export interface ResolveTargetsOptions {
  /** 宿主平台 , 默认取 process.platform */
  hostPlatform?: string
  /** 宿主架构 , 默认取 process.arch */
  hostArch?: string
  win?: true | 'ia32' | 'x64'
  mac?: true | 'x64' | 'arm64' | 'universal'
  linux?: true | 'x64' | 'arm64' | 'armv7l'
  /** 只生成目录 ( unpacked ) */
  dir?: 'dir' | null
}

/** 宿主架构字符串映射为 electron-builder 的 Arch 枚举 */
export function hostArchToBuilderArch(arch: string): Arch {
  switch (arch) {
    case 'ia32':
      return ArchEnum.ia32
    case 'x64':
      return ArchEnum.x64
    case 'arm64':
      return ArchEnum.arm64
    case 'arm':
    case 'armv7l':
      return ArchEnum.armv7l
    case 'universal':
      return ArchEnum.universal
    default:
      return ArchEnum.x64
  }
}

function platformArchs(arch: Exclude<ResolveTargetsOptions['win'] | ResolveTargetsOptions['mac'] | ResolveTargetsOptions['linux'], undefined>, currentArch: Arch): Arch[] {
  if (arch === true || arch == null)
    {return [currentArch]}

  return [hostArchToBuilderArch(arch)]
}

/**
 * 计算本次构建的 targets 映射
 *
 * 规则 :
 * - 未指定平台时 , 默认当前操作系统的平台与架构
 * - `--win` 不指定架构时输出 ia32 和 x64 两个包 ( 与命令行帮助一致 )
 * - `--mac` / `--linux` 不指定架构时使用当前操作系统的架构
 * - mac 包只能在 macOS 上构建 ; linux 包不能在 Windows 上构建 ( electron-builder 限制 )
 */
export function resolveBuildTargets(options: ResolveTargetsOptions = {}): Map<Platform, Map<Arch, string[]>> {
  const hostPlatform = options.hostPlatform ?? process.platform
  const currentArch = hostArchToBuilderArch(options.hostArch ?? process.arch)
  const dir = options.dir ?? null

  const isMacHost = hostPlatform === 'darwin'
  const isWindowsHost = hostPlatform === 'win32'

  if (options.mac !== undefined && !isMacHost)
    {throw new Error('构建 macOS 应用需要在 macOS 系统上运行 ( electron-builder 限制 )')}

  if (options.linux !== undefined && isWindowsHost)
    {throw new Error('Windows 系统不支持构建 linux 应用 ( electron-builder 限制 )')}

  // 平台优先级 : win > mac > linux , 未指定时取宿主平台
  const platformKey
    = options.win !== undefined
      ? 'win'
      : options.mac !== undefined
        ? 'mac'
        : options.linux !== undefined
          ? 'linux'
          : isMacHost
            ? 'mac'
            : isWindowsHost
              ? 'win'
              : 'linux'

  if (platformKey === 'win') {
    // 与命令行帮助一致 : 显式传 --win 但未指定架构时 , 输出 ia32 和 x64 的两个包
    // 未传任何平台参数时 ( 宿主为 Windows 的默认构建 ) , 仅使用当前架构
    const archs = options.win === true
      ? [ArchEnum.ia32, ArchEnum.x64]
      : options.win === undefined
        ? [currentArch]
        : platformArchs(options.win, currentArch)

    return PlatformEnum.WINDOWS.createTarget(dir, ...archs)
  }

  if (platformKey === 'mac') {
    // 未通过命令行显式指定 mac 时 ( 宿主为 mac 的默认构建 ) , 使用当前架构
    const archs = options.mac === undefined ? [currentArch] : platformArchs(options.mac, currentArch)
    return PlatformEnum.MAC.createTarget(dir, ...archs)
  }

  const archs = options.linux === undefined ? [currentArch] : platformArchs(options.linux, currentArch)
  return PlatformEnum.LINUX.createTarget(dir, ...archs)
}
