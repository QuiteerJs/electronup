import type { Arch, Platform, Configuration } from 'electron-builder'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import fsExtra from 'fs-extra'
import { store, DefaultDirs } from '../utils'
import type { BuilderConfig, ElectronupConfig } from '../typings/electronup'
import { getBuilderConfig, getBuilderOutDir, getPreloadFilePatterns } from './builder'

// mock: fs-extra.readJSON 返回固定 package.json
vi.mock('fs-extra', () => ({
  default: {
    readJSON: vi.fn().mockResolvedValue({
      name: 'my-cool-app',
      version: '1.2.3',
    }),
  },
}))

// mock createRequire: getProjectElectronVersion 里 require electron
vi.mock('node:module', () => ({
  createRequire: vi.fn(() => vi.fn(() => ({ version: '30.0.0' }))),
}))

vi.spyOn(process, 'cwd').mockReturnValue('/fake/root')

async function getCfg(config: BuilderConfig = {}, allConfig: ElectronupConfig = {}) {
  const result = await getBuilderConfig(config, allConfig)
  // CliOptions.config 类型是 string | Configuration , 这里断言成 Configuration 以便测试访问字段
  return result.config as Configuration
}

describe('getBuilderConfig', () => {
  let targets: Map<Platform, Map<Arch, string[]>>

  beforeEach(() => {
    store.command = 'build'
    store.asar = undefined
    targets = new Map()
    store.targets = targets
    vi.clearAllMocks()
  })

  it('appId 基于项目名动态生成', async () => {
    const cfg = await getCfg()
    expect(cfg.appId).toBe('com.my-cool-app')
  })

  it('scoped 包名 (@scope/name) 生成无连续点的合法 appId', async () => {
    vi.mocked(fsExtra.readJSON).mockResolvedValueOnce({ name: '@scope/name', version: '1.2.3' })
    const cfg = await getCfg()
    expect(cfg.appId).toBe('com.scope.name')
  })

  it('scoped 包名的 productName 去掉 scope , NSIS 产物名使用 ${productName} 宏', async () => {
    vi.mocked(fsExtra.readJSON).mockResolvedValueOnce({ name: '@scope/app', version: '1.2.3' })
    const cfg = await getCfg()
    expect(cfg.productName).toBe('app')
    expect(cfg.nsis?.artifactName).toBe('${productName} ${arch} Setup ${version}.${ext}')
  })

  it('productName 优先级 : builderConfig > package.json productName > 包名', async () => {
    expect((await getCfg()).productName).toBe('my-cool-app')
    vi.mocked(fsExtra.readJSON).mockResolvedValueOnce({ name: '@scope/app', productName: 'My App', version: '1.2.3' })
    expect((await getCfg()).productName).toBe('My App')
    vi.mocked(fsExtra.readJSON).mockResolvedValueOnce({ name: '@scope/app', productName: 'My App', version: '1.2.3' })
    expect((await getCfg({ productName: 'Custom' })).productName).toBe('Custom')
  })

  it('含空格的包名把空格规整为点', async () => {
    vi.mocked(fsExtra.readJSON).mockResolvedValueOnce({ name: 'my cool app', version: '1.2.3' })
    const cfg = await getCfg()
    expect(cfg.appId).toBe('com.my.cool.app')
  })

  it('纯中文包名回退到 com.electronup', async () => {
    vi.mocked(fsExtra.readJSON).mockResolvedValueOnce({ name: '我的应用', version: '1.2.3' })
    const cfg = await getCfg()
    expect(cfg.appId).toBe('com.electronup')
  })

  it('用户 builderConfig.appId 优先于自动生成', async () => {
    const cfg = await getCfg({ appId: 'com.example.app' })
    expect(cfg.appId).toBe('com.example.app')
  })

  it('asar 默认值不被 store.asar=undefined 覆盖', async () => {
    store.asar = undefined
    const cfg = await getCfg()
    expect(cfg.asar).toBeUndefined()
  })

  it('--no-asar 显式传时 asar=false', async () => {
    store.asar = false
    const cfg = await getCfg()
    expect(cfg.asar).toBe(false)
  })

  it('protocols 默认不注入 deeplink schemes', async () => {
    const cfg = await getCfg()
    expect(cfg.protocols).toBeUndefined()
  })

  it('用户配置的 protocols 能通过 restConfig 覆盖', async () => {
    const cfg = await getCfg({ protocols: { name: 'myapp', schemes: ['myapp'] } })
    expect(cfg.protocols).toEqual({ name: 'myapp', schemes: ['myapp'] })
  })

  it('nsis.perMachine 默认 false', async () => {
    const cfg = await getCfg()
    expect(cfg.nsis?.perMachine).toBe(false)
  })

  it('mac 默认目标包含 dmg 与 zip ( 支持 electron-updater 自动更新 )', async () => {
    const cfg = await getCfg()
    expect(cfg.mac?.target).toEqual(['dmg', 'zip'])
  })

  it('用户 mac 配置可覆盖默认目标', async () => {
    const cfg = await getCfg({ mac: { target: ['dmg'] } })
    expect(cfg.mac?.target).toEqual(['dmg'])
  })

  it('用户只配置 mac 的其它字段时保留默认 dmg + zip 目标', async () => {
    const cfg = await getCfg({ mac: { category: 'public.app-category.developer-tools' } })
    expect(cfg.mac?.target).toEqual(['dmg', 'zip'])
    expect(cfg.mac?.category).toBe('public.app-category.developer-tools')
  })

  it('用户只覆盖部分 nsis 字段时保留其它预置项', async () => {
    const cfg = await getCfg({ nsis: { oneClick: true } })
    expect(cfg.nsis?.oneClick).toBe(true)
    expect(cfg.nsis?.perMachine).toBe(false)
    expect(cfg.nsis?.language).toBe('2052')
    expect(cfg.nsis?.allowToChangeInstallationDirectory).toBe(true)
  })

  it('用户只配置 directories 的其它字段时保留默认 output', async () => {
    const cfg = await getCfg({ directories: { buildResources: 'build-resources' } })
    expect(cfg.directories?.buildResources).toBe('build-resources')
    expect(cfg.directories?.output).toBe(DefaultDirs.outDir)
  })

  it('getBuilderOutDir : directories.output > outDir > 默认值', () => {
    expect(getBuilderOutDir({ directories: { output: 'release' } }, 'dist/x')).toBe('release')
    expect(getBuilderOutDir({}, 'dist/x')).toBe('dist/x')
    expect(getBuilderOutDir(undefined, undefined)).toBe(DefaultDirs.outDir)
  })

  it('builderConfig.directories.output 优先于默认 outDir', async () => {
    const cfg = await getCfg({ directories: { output: 'dist/custom-out' } })
    expect(cfg.directories?.output).toBe('dist/custom-out')
  })

  it('用户 config 中的 asar=true 能生效', async () => {
    const cfg = await getCfg({ asar: true })
    expect(cfg.asar).toBe(true)
  })

  it('显式 --no-asar 优先于 builderConfig.asar', async () => {
    store.asar = false
    const cfg = await getCfg({ asar: true })
    expect(cfg.asar).toBe(false)
  })

  it('resourceDir 决定 files 路径', async () => {
    const cfg = await getCfg({}, { resourceDir: 'out/rsc' })
    expect((cfg.files as string[])[0]).toBe('out/rsc/**/*')
  })

  it('未指定 resourceDir 时使用 DefaultDirs.resourceDir', async () => {
    const cfg = await getCfg()
    expect((cfg.files as string[])[0]).toBe(`${DefaultDirs.resourceDir}/**/*`)
  })

  it('fs.readJSON 被正确调用', async () => {
    await getCfg()
    expect(fsExtra.readJSON).toHaveBeenCalled()
  })

  it('preload 输出到 resourceDir 之外 ( 项目内 ) 时加入默认 files', async () => {
    const allConfig: ElectronupConfig = {
      preload: [
        { entry: 'a.ts' },
        { entry: 'b.ts', outDir: 'dist/resource/sub' },
        { entry: 'c.ts', outDir: 'custom-preload' },
        { entry: 'd.ts', outDir: 'custom-preload' },
      ],
    }
    expect(getPreloadFilePatterns(allConfig)).toEqual(['custom-preload/**/*'])
    const cfg = await getCfg({}, allConfig)
    expect(cfg.files).toEqual([`${DefaultDirs.resourceDir}/**/*`, 'custom-preload/**/*'])
  })

  it('preload 输出到项目根或项目外时报错', () => {
    expect(() => getPreloadFilePatterns({ preload: { entry: 'a.ts', outDir: '.' } })).toThrow('项目根目录之内')
    expect(() => getPreloadFilePatterns({ preload: { entry: 'a.ts', outDir: '../outside' } })).toThrow('项目根目录之内')
  })

  it('用户自定义 files 时整体覆盖默认值', async () => {
    const cfg = await getCfg({ files: ['only/**/*'] }, { preload: { entry: 'a.ts', outDir: 'custom-preload' } })
    expect(cfg.files).toEqual(['only/**/*'])
  })
})
