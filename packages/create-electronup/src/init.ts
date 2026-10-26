import type { Framework } from './utils'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import * as prompts from '@clack/prompts'
import degit from 'degit'
import mri from 'mri'
import pc from 'picocolors'
import { defaultTargetDir, emptyDir, formatTargetDir, FRAMEWORKS, isEmpty, pkgFromUserAgent, remote, TEMPLATES } from './utils'

export interface InitOptions {
  /** 命令行参数 ( 不含 node 与脚本路径 ) */
  args?: string[]
  cwd?: string
  userAgent?: string
}

export async function init(options: InitOptions = {}) {
  const {
    args = process.argv.slice(2),
    cwd = process.cwd(),
    userAgent = process.env.npm_config_user_agent,
  } = options

  // Avoids autoconversion to number of the project name by defining that the args
  // non associated with an option ( _ ) needs to be parsed as a string. See #4606
  const argv = mri<{
    t?: string
    template?: string
  }>(args, { string: ['_'] })

  const argTargetDir = formatTargetDir(argv._[0])
  const argTemplate = argv.template || argv.t

  let targetDir = argTargetDir || defaultTargetDir
  let result = {} as any

  try {
    // 获取项目名称
    let projectName = argTargetDir
    if (!projectName) {
      const projectNameResult = await prompts.text({
        message: pc.reset('项目名称：'),
        placeholder: defaultTargetDir,
      })

      if (prompts.isCancel(projectNameResult)) {
        throw new Error(`${pc.red('✖')} Operation cancelled`)
      }

      projectName = projectNameResult
      targetDir = formatTargetDir(projectName) || defaultTargetDir
    }

    // 检查目录是否为空
    let overwrite = false
    const targetPath = path.resolve(cwd, targetDir)
    if (fs.existsSync(targetPath) && !isEmpty(targetPath)) {
      const overwriteResult = await prompts.confirm({
        message: `${targetDir === '.' ? '当前目录' : `目标目录 "${targetDir}"`} 不为空，是否清空继续？`,
      })

      if (prompts.isCancel(overwriteResult)) {
        throw new Error(`${pc.red('✖')} Operation cancelled`)
      }

      overwrite = overwriteResult

      if (!overwrite) {
        throw new Error(`${pc.red('✖')} Operation cancelled`)
      }
    }

    // 选择框架
    let framework: Framework | null = null
    if (!argTemplate || !TEMPLATES.includes(argTemplate)) {
      const frameworkResult = await prompts.select({
        message: typeof argTemplate === 'string' && !TEMPLATES.includes(argTemplate)
          ? pc.reset(`"${argTemplate}" 不是有效模板，请从下方选择：`)
          : pc.reset('请选择框架：'),
        options: FRAMEWORKS.map(fw => ({
          label: fw.color(fw.display || fw.name),
          value: fw,
        })),
      })

      if (prompts.isCancel(frameworkResult)) {
        throw new Error(`${pc.red('✖')} Operation cancelled`)
      }

      framework = frameworkResult
    }
    else {
      framework = FRAMEWORKS.find(f => f.name === argTemplate) || null
    }

    // 选择变体
    let variant = ''
    if (framework && framework.variants) {
      const variantResult = await prompts.select({
        message: pc.reset('请选择变体：'),
        options: framework.variants.map(v => ({
          label: v.color(v.display || v.name),
          value: v.name,
        })),
      })

      if (prompts.isCancel(variantResult)) {
        throw new Error(`${pc.red('✖')} Operation cancelled`)
      }

      variant = variantResult
    }

    // 构建结果对象
    result = {
      projectName: targetDir,
      overwrite,
      framework,
      variant,
    }
  }
  catch (cancelled: any) {
    // oxlint-disable-next-line no-console
    console.log(cancelled.message)
    return
  }

  // 用户选择与提示相关联
  // user choice associated with prompts
  const { framework, overwrite, variant } = result

  const root = path.join(cwd, targetDir)

  // 存在目录
  // 清空目录
  if (overwrite)
    {emptyDir(root)}
  // 不存在
  // 创建目录
  else if (!fs.existsSync(root))
    {fs.mkdirSync(root, { recursive: true })}

  // determine template
  const template: string = variant || framework?.name || argTemplate || ''

  const pkgInfo = pkgFromUserAgent(userAgent)
  const pkgManager = pkgInfo ? pkgInfo.name : 'npm'

  const spinner = prompts.spinner()
  spinner.start(`正在拉取模板：${template}`)
  const emitter = degit(`${remote}#${template}`, { cache: false, force: overwrite })
  await emitter.clone(root)
  spinner.stop('模板拉取完成')

  // oxlint-disable-next-line no-console
  console.log('\n完成。请执行：\n')

  // 比对路径
  const cdProjectName = path.relative(cwd, root)

  // 创建成功后给出的提示文字
  if (root !== cwd) {
    const cdCommand = `\ncd ${cdProjectName.includes(' ') ? `"${cdProjectName}"` : cdProjectName}\n`

    // oxlint-disable-next-line no-console
    console.log(pc.green(cdCommand))
  }

  const inStallCommand = pkgManager === 'yarn' ? 'yarn' : `${pkgManager} install\n`
  // oxlint-disable-next-line no-console
  console.log(pc.yellow(inStallCommand))
  const devConmand = pkgManager === 'yarn' ? 'yarn dev' : `${pkgManager} run dev`
  // oxlint-disable-next-line no-console
  console.log(pc.cyan(devConmand))
}
