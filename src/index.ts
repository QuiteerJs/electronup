import type { UserElectronupConfig } from './typings/electronup'

export const defineConfig = (config: UserElectronupConfig): UserElectronupConfig => config

export type { ElectronupConfig, ViteConfig, ConfigEnv, TsupConfig, BuilderConfig } from './typings/electronup'
