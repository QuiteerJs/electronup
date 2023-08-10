import type { ConfigEnv, ElectronupConfig } from './typings/electronup'

export type ElectronupConfigFnObject = (env: ConfigEnv) => ElectronupConfig
export type ElectronupConfigFnPromise = (env: ConfigEnv) => Promise<ElectronupConfig>
export type ElectronupConfigFn = (env: ConfigEnv) => ElectronupConfig | Promise<ElectronupConfig>

export type ElectronupConfigExport =
  | ElectronupConfig
  | Promise<ElectronupConfig>
  | ElectronupConfigFnObject
  | ElectronupConfigFnPromise
  | ElectronupConfigFn

export function defineConfig(config: ElectronupConfig): ElectronupConfig

export function defineConfig(config: Promise<ElectronupConfig>): Promise<ElectronupConfig>

export function defineConfig(config: ElectronupConfigFnObject): ElectronupConfigFnObject

export function defineConfig(config: ElectronupConfigExport): ElectronupConfigExport

export function defineConfig(config: ElectronupConfigExport): ElectronupConfigExport {
  return config
}

export type { ElectronupConfig, ViteConfig, ConfigEnv, TsupConfig, BuilderConfig } from './typings/electronup'
