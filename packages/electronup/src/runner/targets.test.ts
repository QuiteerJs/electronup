import type { Arch, Platform } from 'electron-builder'
import { describe, expect, it } from 'vitest'
import { Arch as ArchEnum } from 'electron-builder'
import { hostArchToBuilderArch, resolveBuildTargets } from './targets'

interface TargetSummary {
  platform: string
  archs: Arch[]
  formats: string[]
}

function summarize(targets: Map<Platform, Map<Arch, string[]>>): TargetSummary[] {
  return [...targets.entries()].map(([platform, archMap]) => ({
    platform: platform.name,
    archs: [...archMap.keys()],
    formats: [...new Set([...archMap.values()].flat())],
  }))
}

describe('hostArchToBuilderArch', () => {
  it('映射常见架构字符串', () => {
    expect(hostArchToBuilderArch('ia32')).toBe(ArchEnum.ia32)
    expect(hostArchToBuilderArch('x64')).toBe(ArchEnum.x64)
    expect(hostArchToBuilderArch('arm64')).toBe(ArchEnum.arm64)
    expect(hostArchToBuilderArch('arm')).toBe(ArchEnum.armv7l)
  })

  it('未知架构回退到 x64', () => {
    expect(hostArchToBuilderArch('mips')).toBe(ArchEnum.x64)
    expect(hostArchToBuilderArch('')).toBe(ArchEnum.x64)
  })
})

describe('resolveBuildTargets', () => {
  it('win 不指定架构时输出 ia32 和 x64 两个包', () => {
    const summary = summarize(resolveBuildTargets({ hostPlatform: 'win32', win: true }))
    expect(summary).toHaveLength(1)
    expect(summary[0].platform).toBe('windows')
    expect(summary[0].archs).toEqual([ArchEnum.ia32, ArchEnum.x64])
  })

  it('win 指定 x64 / ia32 时只输出对应架构', () => {
    expect(summarize(resolveBuildTargets({ hostPlatform: 'win32', win: 'x64' }))[0].archs)
      .toEqual([ArchEnum.x64])
    expect(summarize(resolveBuildTargets({ hostPlatform: 'win32', win: 'ia32' }))[0].archs)
      .toEqual([ArchEnum.ia32])
  })

  it('mac 指定 x64 / arm64 / universal', () => {
    const hostPlatform = 'darwin'
    expect(summarize(resolveBuildTargets({ hostPlatform, mac: 'x64' }))[0].archs).toEqual([ArchEnum.x64])
    expect(summarize(resolveBuildTargets({ hostPlatform, mac: 'arm64' }))[0].archs).toEqual([ArchEnum.arm64])
    expect(summarize(resolveBuildTargets({ hostPlatform, mac: 'universal' }))[0].archs).toEqual([ArchEnum.universal])
  })

  it('linux 指定 x64 / arm64 / armv7l', () => {
    const hostPlatform = 'linux'
    expect(summarize(resolveBuildTargets({ hostPlatform, linux: 'x64' }))[0].archs).toEqual([ArchEnum.x64])
    expect(summarize(resolveBuildTargets({ hostPlatform, linux: 'arm64' }))[0].archs).toEqual([ArchEnum.arm64])
    expect(summarize(resolveBuildTargets({ hostPlatform, linux: 'armv7l' }))[0].archs).toEqual([ArchEnum.armv7l])
  })

  it('不指定平台时默认当前操作系统与架构', () => {
    expect(summarize(resolveBuildTargets({ hostPlatform: 'win32', hostArch: 'x64' }))[0])
      .toMatchObject({ platform: 'windows', archs: [ArchEnum.x64] })
    expect(summarize(resolveBuildTargets({ hostPlatform: 'darwin', hostArch: 'arm64' }))[0])
      .toMatchObject({ platform: 'mac', archs: [ArchEnum.arm64] })
    expect(summarize(resolveBuildTargets({ hostPlatform: 'linux', hostArch: 'x64' }))[0])
      .toMatchObject({ platform: 'linux', archs: [ArchEnum.x64] })
  })

  it('linux 宿主架构为 arm 时映射为 armv7l', () => {
    expect(summarize(resolveBuildTargets({ hostPlatform: 'linux', hostArch: 'arm' }))[0].archs)
      .toEqual([ArchEnum.armv7l])
  })

  it('mac 默认构建使用宿主架构而非 x64', () => {
    const summary = summarize(resolveBuildTargets({ hostPlatform: 'darwin', hostArch: 'arm64' }))
    expect(summary[0].archs).toEqual([ArchEnum.arm64])
  })

  it('--dir 时 target 为 dir , 否则为空 ( 使用 electron-builder 配置的 target )', () => {
    const dir = summarize(resolveBuildTargets({ hostPlatform: 'win32', win: 'x64', dir: 'dir' }))[0]
    expect(dir.formats).toEqual(['dir'])

    const noDir = summarize(resolveBuildTargets({ hostPlatform: 'win32', win: 'x64', dir: null }))[0]
    expect(noDir.formats).toEqual([])
  })

  it('mac 上允许构建 win 与 linux 包', () => {
    expect(summarize(resolveBuildTargets({ hostPlatform: 'darwin', win: 'x64' }))[0].platform)
      .toBe('windows')
    expect(summarize(resolveBuildTargets({ hostPlatform: 'darwin', linux: 'x64' }))[0].platform)
      .toBe('linux')
  })

  it('非 mac 系统禁止构建 mac 包', () => {
    expect(() => resolveBuildTargets({ hostPlatform: 'win32', mac: true })).toThrow(/macOS/)
    expect(() => resolveBuildTargets({ hostPlatform: 'linux', mac: 'arm64' })).toThrow(/macOS/)
  })

  it('Windows 系统禁止构建 linux 包', () => {
    expect(() => resolveBuildTargets({ hostPlatform: 'win32', linux: true })).toThrow(/linux/)
  })

  it('平台参数优先级为 win > mac > linux', () => {
    const summary = summarize(resolveBuildTargets({
      hostPlatform: 'darwin',
      win: 'x64',
      mac: 'arm64',
      linux: 'x64',
    }))
    expect(summary[0].platform).toBe('windows')
    expect(summary[0].archs).toEqual([ArchEnum.x64])
  })

  it('非法架构直接报错 , 不再回退为 x64', () => {
    expect(() => resolveBuildTargets({ hostPlatform: 'win32', win: 'foo' as any })).toThrow('--win 不支持架构 foo , 可选 : ia32 | x64 | arm64')
    expect(() => resolveBuildTargets({ hostPlatform: 'darwin', mac: 'ia32' as any })).toThrow('--mac 不支持架构 ia32')
    expect(() => resolveBuildTargets({ hostPlatform: 'linux', linux: 'universal' as any })).toThrow('--linux 不支持架构 universal')
    // cac 会把纯数字参数解析为 number
    expect(() => resolveBuildTargets({ hostPlatform: 'win32', win: 64 as any })).toThrow('--win 不支持架构 64')
  })

  it('win 支持 arm64', () => {
    expect(summarize(resolveBuildTargets({ hostPlatform: 'win32', win: 'arm64' }))[0].archs).toEqual([ArchEnum.arm64])
  })

  it('重复传参时合并多个架构并去重 , 其中任一非法即报错', () => {
    expect(summarize(resolveBuildTargets({ hostPlatform: 'win32', win: ['x64', 'arm64', 'x64'] }))[0].archs)
      .toEqual([ArchEnum.x64, ArchEnum.arm64])
    expect(() => resolveBuildTargets({ hostPlatform: 'win32', win: ['x64', 'foo' as any] })).toThrow('foo')
  })
})
