import type { ElectronupConfig, ElectronupConfigAsyncFn, ElectronupConfigFn } from './typings/electronup'

export declare function defineConfig(config: ElectronupConfig): ElectronupConfig

export declare function defineConfig(config: Promise<ElectronupConfig>): Promise<ElectronupConfig>

export declare function defineConfig(config: ElectronupConfigFn): ElectronupConfigFn

export declare function defineConfig(config: ElectronupConfigAsyncFn): ElectronupConfigAsyncFn

export type { ElectronupConfig, ViteConfig, ConfigEnv, TsupConfig, BuilderConfig } from './typings/electronup'
