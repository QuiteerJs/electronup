import type { ElectronupConfigExport } from '../typings/electronup'
import { extname, join, resolve } from 'node:path'
import process from 'node:process'
import { parserConfig } from '@quiteer/parser-config'
import fsExtra from 'fs-extra'
import { store } from '../utils'

const SUFFIXES = ['ts', 'mjs', 'cjs', 'js']

const NOT_FOUND = '找不到 electronup.config.ts | electronup.config.mjs | electronup.config.cjs | electronup.config.js , 请在根目录下添加配置文件 , 或显式的指定配置文件路径（相对于根目录）'
const PARSING_FAILED = '找到了配置文件,但解析配置文件失败！'

async function configPath(filePath: string | undefined) {
  const { pathExists, stat } = fsExtra
  const { root } = store

  // 显式路径 : 相对路径基于项目根解析 , 绝对路径原样使用 ; 不存在时直接报错 , 绝不回退到标准名配置
  if (filePath) {
    const path = resolve(root, filePath)

    if (!(await pathExists(path)) || !(await stat(path)).isFile())
      {throw new Error(`找不到指定的配置文件 : ${path}`)}

    if (!SUFFIXES.includes(extname(path).slice(1)))
      {throw new Error(`不支持的配置文件类型 : ${path} , 仅支持 ${SUFFIXES.map(s => `.${s}`).join(' | ')}`)}

    return path
  }

  const configList = SUFFIXES.map(suffix => `${join(root, 'electronup.config')}.${suffix}`)

  const index = (await Promise.all(configList.map(path => pathExists(path)))).findIndex(flag => flag)

  if (index > -1)
    {return configList[index]}

  throw new Error(NOT_FOUND)
}

/**
 * 调用 parser-config 加载配置 , 并把它内部吞掉的错误转成 reject
 *
 * @quiteer/parser-config 1.0.3 用 `new Promise(t => load().then(t))` 包装加载 , 语法错误等失败时
 * 返回的 Promise 永不 reject , 错误变成未处理拒绝 . 加载期间临时监听 unhandledRejection 接住它
 */
function loadConfigFile(path: string): Promise<ElectronupConfigExport> {
  return new Promise((resolve, reject) => {
    const onRejection = (reason: unknown) => reject(reason)
    process.once('unhandledRejection', onRejection)
    // 不传 configName : 传了会让 parser-config 丢弃文件名 , 改为在同目录搜索标准名配置
    parserConfig(path)
      .then(resolve, reject)
      .finally(() => process.off('unhandledRejection', onRejection))
  })
}

/**
 * 读取配置文件的原始导出 ( 可能是对象、Promise 或函数 ) ,
 * 需再经 resolveElectronupConfig 执行 / 校验后才能读取 resourceDir 等字段
 */
export async function getConfig(filePath: string | undefined): Promise<ElectronupConfigExport> {
  const path = await configPath(filePath)

  try {
    return await loadConfigFile(path)
  }
  catch (error) {
    throw new Error(`${PARSING_FAILED} ( ${path} )`, { cause: error })
  }
}
