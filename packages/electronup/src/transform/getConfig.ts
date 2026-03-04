import type { ElectronupConfig } from '../typings/electronup'
import { join } from 'node:path'
import { parserConfig } from '@quiteer/parser-config'
import fsExtra from 'fs-extra'
import { store } from '../utils'

const NOT_FOUND = '找不到 electronup.config.ts | electronup.config.js | electronup.config.json , 请在根目录下添加配置文件 , 或显式的指定配置文件路径（相对于根目录）'
const PARSING_FAILED = '找到了配置文件,但解析配置文件失败！'

async function configPath(filePath: string | undefined) {
  const { pathExists } = fsExtra
  const { root } = store

  if (filePath)
    return join(root, filePath)

  const configList = ['ts', 'mjs', 'cjs', 'js'].map(suffix => `${join(root, 'electronup.config')}.${suffix}`)

  const index = (await Promise.all(configList.map(path => pathExists(path)))).findIndex(flag => flag)

  if (index > -1)
    return configList[index]

  throw new Error(NOT_FOUND)
}

export async function getConfig(filePath: string | undefined): Promise<ElectronupConfig> {
  const path = await configPath(filePath)

  try {
    const option: ElectronupConfig = await parserConfig(path, 'electronup.config')
    return option
  }
  catch (error) {
    console.error('error :>> ', error)
    throw new Error(PARSING_FAILED)
  }
}
