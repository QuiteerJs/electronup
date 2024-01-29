import type { ElectronupConfig, ElectronupConfigExport, ElectronupConfigFnObject } from './typings/electronup'

export function defineConfig(config: ElectronupConfig): ElectronupConfig

export function defineConfig(config: Promise<ElectronupConfig>): Promise<ElectronupConfig>

export function defineConfig(config: ElectronupConfigFnObject): ElectronupConfigFnObject

export function defineConfig(config: ElectronupConfigExport): ElectronupConfigExport

export function defineConfig(config: ElectronupConfigExport): ElectronupConfigExport {
  return config
}

export type { ElectronupConfig, ViteConfig, ConfigEnv, TsupConfig, BuilderConfig } from './typings/electronup'
