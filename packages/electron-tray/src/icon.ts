import { nativeImage } from 'electron'
import type { NativeImage } from 'electron'
import type { TrayIconOptions, TrayIconSource } from './types'

/**
 * 判断图标来源是否为 NativeImage
 *
 * 用 getSize 做鸭子类型判断: NativeImage 无公开构造函数可 instanceof,
 * 而 `typeof source !== 'string'` 会把图标状态表一并误判
 */
export function isNativeImage(source: TrayIconSource): source is NativeImage {
  return typeof source !== 'string' && typeof (source as NativeImage).getSize === 'function'
}

/** 判断图标配置是否为状态表 (非字符串且非 NativeImage) */
export function isIconMap<S extends string>(
  icon: TrayIconSource | Record<S, TrayIconSource>
): icon is Record<S, TrayIconSource> {
  return typeof icon !== 'string' && !isNativeImage(icon as TrayIconSource)
}

/**
 * 归一化图标来源
 *
 * - 字符串按 `data:` 前缀自动走 createFromDataURL, 否则按文件路径 createFromPath
 * - 传入 NativeImage 时按需 resize, 未指定尺寸则复用同一实例
 */
export function resolveIcon(source: TrayIconSource, options: TrayIconOptions = {}): TrayIconSource {
  const { size, template } = options

  const base = typeof source === 'string'
    ? source.startsWith('data:')
      ? nativeImage.createFromDataURL(source)
      : nativeImage.createFromPath(source)
    : source

  const image = size ? base.resize(size) : base

  if (template)
    image.setTemplateImage(true)

  return image
}
