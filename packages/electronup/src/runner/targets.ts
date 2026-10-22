import type { Arch, Platform } from 'electron-builder'
import process from 'node:process'
import { Arch as ArchEnum, Platform as PlatformEnum } from 'electron-builder'

export type WinArch = 'ia32' | 'x64' | 'arm64'
export type MacArch = 'x64' | 'arm64' | 'universal'
export type LinuxArch = 'x64' | 'arm64' | 'armv7l'
/** true 表示未指定架构 ; 重复传参 ( --win x64 --win ia32 ) 时 cac 给出数组 */
type ArchOption<T extends string> = true | T | Array<true | T>

/** 各平台允许的架构 , 与命令行帮助保持一致 */
export const PLATFORM_ARCHS = {
  win: ['ia32', 'x64', 'arm64'],
  mac: ['x64', 'arm64', 'universal'],
  linux: ['x64', 'arm64', 'armv7l'],
} as const satisfies Record<'win' | 'mac' | 'linux', readonly string[]>

export interface ResolveTargetsOptions {
  /** 宿主平台 , 默认取 process.platform */
  hostPlatform?: string
  /** 宿主架构 , 默认取 process.arch */
  hostArch?: string
  win?: ArchOption<WinArch>
  mac?: ArchOption<MacArch>
  linux?: ArchOption<LinuxArch>
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

/**
 * 校验并解析命令行传入的架构 ; 非法值直接报错 , 不再静默回退为 x64
 *
 * @param defaults 未指定架构 ( true ) 时使用的架构
 */
function platformArchs(key: keyof typeof PLATFORM_ARCHS, value: ArchOption<string>, defaults: Arch[]): Arch[] {
  const allowed: readonly string[] = PLATFORM_ARCHS[key]
  const archs = new Set<Arch>()

  for (const item of [value].flat()) {
    if (item === true) {
      defaults.forEach(arch => archs.add(arch))
      continue
    }
    // cac 会把纯数字参数 ( 如 --win 64 ) 解析为 number , 类型上虽是 string 仍需转换
    // oxlint-disable-next-line no-unnecessary-type-conversion
    const name = String(item)
    if (!allowed.includes(name))
      {throw new Error(`--${key} 不支持架构 ${name} , 可选 : ${allowed.join(' | ')}`)}
    archs.add(hostArchToBuilderArch(name))
  }

  return [...archs]
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
    const archs = options.win === undefined
      ? [currentArch]
      : platformArchs('win', options.win, [ArchEnum.ia32, ArchEnum.x64])

    return PlatformEnum.WINDOWS.createTarget(dir, ...archs)
  }

  if (platformKey === 'mac') {
    // 未通过命令行显式指定 mac 时 ( 宿主为 mac 的默认构建 ) , 使用当前架构
    const archs = options.mac === undefined ? [currentArch] : platformArchs('mac', options.mac, [currentArch])
    return PlatformEnum.MAC.createTarget(dir, ...archs)
  }

  const archs = options.linux === undefined ? [currentArch] : platformArchs('linux', options.linux, [currentArch])
  return PlatformEnum.LINUX.createTarget(dir, ...archs)
}
