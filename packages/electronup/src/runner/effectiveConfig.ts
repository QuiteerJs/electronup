import type { Platform } from 'electron-builder'
import process from 'node:process'
import { Arch } from 'electron-builder'
import fsExtra from 'fs-extra'
import pc from 'picocolors'
import { stringify } from 'yaml'
import { version } from '../../package.json'

export const EFFECTIVE_CONFIG_FILE = 'electronup-effective-config.yaml'

type Targets = Map<Platform, Map<Arch, string[]>>

/** plugins 只保留名称 : 插件对象内部状态 ( 如 vite:vue 的 api.options ) 对排查无意义且体积很大 */
function pluginNames(plugins: unknown[]): unknown[] {
  return plugins.flat(Infinity as 1).filter(Boolean).map(plugin =>
    typeof plugin === 'object' && plugin !== null && 'name' in plugin ? String(plugin.name) : toPlain(plugin, new WeakSet()))
}

/** builder.targets : Map<Platform, Map<Arch, string[]>> → { windows: { x64: ['dir'] } } */
function describeTargets(targets: Targets) {
  return Object.fromEntries([...targets].map(([platform, archs]) => [
    platform.name,
    Object.fromEntries([...archs].map(([arch, list]) => [Arch[arch], list])),
  ]))
}

/**
 * 转成可序列化的普通值 : 函数 → `[Function name]` , RegExp → 字面量字符串 , Map / Set → 对象 / 数组 ,
 * 循环引用 → `[Circular]` , undefined 字段省略
 */
function toPlain(value: unknown, seen: WeakSet<object>): unknown {
  if (typeof value === 'function')
    {return `[Function ${value.name || 'anonymous'}]`}
  if (typeof value === 'bigint' || typeof value === 'symbol')
    {return value.toString()}
  if (value === null || typeof value !== 'object')
    {return value}
  if (value instanceof RegExp)
    {return value.toString()}
  if (value instanceof Date)
    {return value.toISOString()}
  if (seen.has(value))
    {return '[Circular]'}

  seen.add(value)
  let result: unknown
  if (value instanceof Map) {
    result = Object.fromEntries([...value].map(([key, item]) => [
      typeof key === 'object' && key !== null && 'name' in key ? String(key.name) : String(key),
      toPlain(item, seen),
    ]))
  }
  else if (value instanceof Set || Array.isArray(value)) {
    result = [...value].map(item => toPlain(item, seen))
  }
  else {
    const entries = Object.entries(value)
      .filter(([, item]) => item !== undefined)
      .map(([key, item]) => [key, key === 'plugins' && Array.isArray(item) ? pluginNames(item) : toPlain(item, seen)])
    result = Object.fromEntries(entries)
  }
  // 只标记当前路径上的对象 , 同一对象被多处引用 ( 非循环 ) 时照常展开
  seen.delete(value)
  return result
}

/**
 * 生成 effective config 快照 , 需在 electron-builder 执行前调用 ( 它会原地改写 files 等字段 )
 */
export function toPlainConfig(config: object) {
  const plain = toPlain(config, new WeakSet()) as Record<string, any>
  const targets = (config as { builder?: { targets?: unknown } }).builder?.targets
  if (targets instanceof Map)
    {plain.builder.targets = describeTargets(targets as Targets)}
  return plain
}

/**
 * 写入实际生效配置 , 仅用于排查 : 目录不存在时自动创建 , 写入失败只告警 , 不影响构建结果
 */
export async function writeEffectiveConfig(file: string, snapshot: unknown) {
  const header = [
    `# electronup ${version} · ${new Date().toISOString()}`,
    `# 命令 : electronup ${process.argv.slice(2).join(' ')}`,
    '# 仅用于排查 : 函数 / 插件只保留名称 , 并非完整的运行时配置',
    '',
  ].join('\n')

  try {
    await fsExtra.outputFile(file, header + stringify(snapshot))
  }
  catch (error: any) {
    console.error(`${pc.yellow('warn')} 写入 ${file} 失败 , 不影响构建产物 : ${error.message}`)
  }
}
