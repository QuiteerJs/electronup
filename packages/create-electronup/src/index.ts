import type { Template } from './getData'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import * as prompts from '@clack/prompts'
import ejs from 'ejs'
import { blue, cyan, green, lightBlue, lightCyan, lightGreen, lightYellow, red, reset, yellow } from 'kolorist'
import minimist from 'minimist'
import { getData } from './getData'

// Avoids autoconversion to number of the project name by defining that the args
// non associated with an option ( _ ) needs to be parsed as a string. See #4606
const argv = minimist<{
  t?: string
  template?: string
}>(process.argv.slice(2), { string: ['_'] })

const cwd = process.cwd()

type ColorFunc = (str: string | number) => string
interface Framework {
  name: string
  display: string
  color: ColorFunc
  variants?: FrameworkVariant[]
}
interface FrameworkVariant {
  name: string
  display: string
  color: ColorFunc
  customCommand?: string
}

const FRAMEWORKS: Framework[] = [
  {
    name: 'vanilla',
    display: 'Vanilla + TS',
    color: yellow,
  },
  {
    name: 'vue',
    display: 'Vue + TS',
    color: green,
  },
  {
    name: 'react',
    display: 'React + TS',
    color: cyan,
    variants: [
      {
        name: 'react',
        display: 'TypeScript',
        color: lightBlue,
      },
      {
        name: 'react-swc',
        display: 'TypeScript + SWC',
        color: blue,
      },
    ],
  },
  {
    name: 'solid',
    display: 'Solid + TS',
    color: blue,
  },
]

const TEMPLATES = FRAMEWORKS.map(
  f => (f.variants && f.variants.map(v => v.name)) || [f.name],
).reduce((a, b) => a.concat(b), [])

const renameFiles: Record<string, string | undefined> = {
  _gitignore: '.gitignore',
  _npmrc: '.npmrc',
}

const defaultTargetDir = 'electronup-project'

async function init() {
  const argTargetDir = formatTargetDir(argv._[0])
  const argTemplate = argv.template || argv.t

  let targetDir = argTargetDir || defaultTargetDir
  const getProjectName = () => (targetDir === '.' ? path.basename(path.resolve()) : targetDir)

  let result = {} as any

  try {
    // 获取项目名称
    let projectName = argTargetDir
    if (!projectName) {
      const projectNameResult = await prompts.text({
        message: reset('Project name:'),
        placeholder: defaultTargetDir,
      })

      if (prompts.isCancel(projectNameResult)) {
        throw new Error(`${red('✖')} Operation cancelled`)
      }

      projectName = projectNameResult as string
      targetDir = formatTargetDir(projectName) || defaultTargetDir
    }

    // 检查目录是否为空
    let overwrite = false
    if (fs.existsSync(targetDir) && !isEmpty(targetDir)) {
      const overwriteResult = await prompts.confirm({
        message: `${targetDir === '.' ? 'Current directory' : `Target directory "${targetDir}"`} is not empty. Remove existing files and continue?`,
      })

      if (prompts.isCancel(overwriteResult)) {
        throw new Error(`${red('✖')} Operation cancelled`)
      }

      overwrite = overwriteResult as boolean

      if (!overwrite) {
        throw new Error(`${red('✖')} Operation cancelled`)
      }
    }

    // 验证包名
    let packageName = getProjectName()
    if (!isValidPackageName(packageName)) {
      const packageNameResult = await prompts.text({
        message: reset('Package name:'),
        placeholder: toValidPackageName(packageName),
        validate: value => !isValidPackageName(value) ? 'Invalid package.json name' : undefined,
      })

      if (prompts.isCancel(packageNameResult)) {
        throw new Error(`${red('✖')} Operation cancelled`)
      }

      packageName = packageNameResult as string
    }

    // 选择框架
    let framework: Framework | null = null
    if (!argTemplate || !TEMPLATES.includes(argTemplate)) {
      const frameworkResult = await prompts.select({
        message: typeof argTemplate === 'string' && !TEMPLATES.includes(argTemplate)
          ? reset(`"${argTemplate}" isn't a valid template. Please choose from below: `)
          : reset('Select a framework:'),
        options: FRAMEWORKS.map(fw => ({
          label: fw.color(fw.display || fw.name),
          value: fw,
        })),
      })

      if (prompts.isCancel(frameworkResult)) {
        throw new Error(`${red('✖')} Operation cancelled`)
      }

      framework = frameworkResult as Framework
    }
    else {
      framework = FRAMEWORKS.find(f => f.name === argTemplate) || null
    }

    // 选择变体
    let variant = ''
    if (framework && framework.variants) {
      const variantResult = await prompts.select({
        message: reset('Select a variant:'),
        options: framework.variants.map(v => ({
          label: v.color(v.display || v.name),
          value: v.name,
        })),
      })

      if (prompts.isCancel(variantResult)) {
        throw new Error(`${red('✖')} Operation cancelled`)
      }

      variant = variantResult as string
    }

    // 是否使用国内镜像
    const isRegistry = await prompts.confirm({
      message: '是否开启 npm 国内镜像源 ?',
    })

    if (prompts.isCancel(isRegistry)) {
      throw new Error(`${red('✖')} Operation cancelled`)
    }

    // 构建结果对象
    result = {
      projectName: targetDir,
      overwrite,
      packageName,
      framework,
      variant,
      isRegistry,
    }
  }
  catch (cancelled: any) {
    // eslint-disable-next-line no-console
    console.log(cancelled.message)
    return
  }

  // 用户选择与提示相关联
  // user choice associated with prompts
  const { framework, overwrite, packageName, variant, isRegistry } = result

  const root = path.join(cwd, targetDir)

  // 存在目录
  // 清空目录
  if (overwrite)
    emptyDir(root)
  // 不存在
  // 创建目录
  else if (!fs.existsSync(root))
    fs.mkdirSync(root, { recursive: true })

  // determine template
  const template: string = variant || framework?.name || argTemplate || ''

  // 返回模板所在路径
  const templateDir = path.resolve(fileURLToPath(import.meta.url), '../..', 'template')

  // 默认模板
  const baseTemplateDir = path.resolve(templateDir, 'base')

  const pkgInfo = pkgFromUserAgent(process.env.npm_config_user_agent)
  const pkgManager = pkgInfo ? pkgInfo.name : 'npm'

  const writeTemplate = (dirPath: string, dir = '') => {
    // 读取模板目录结构
    const files = fs.readdirSync(dirPath)
    // 遍历模板生成模板
    for (const file of files) {
      // 处理需要重命名的文件
      let targetPath = path.join(root, dir, renameFiles[file] ?? file)
      // 处理默认模板中 ejs 模板
      if (file.endsWith('.ejs')) {
        const filepath = path.resolve(dirPath, file)
        const dest = file.replace(/\.ejs$/, '')
        targetPath = path.join(root, dir, dest)

        const writeTempl = (options: Record<string, any>) => {
          const templateContent = fs.readFileSync(filepath, 'utf-8')
          const content = ejs.render(templateContent, options)
          fs.writeFileSync(targetPath, content)
        }

        let options: Record<string, any> = {
          name: packageName ?? getProjectName(),
          template,
          pkgManager,
          isRegistry,
        }

        if (dest === 'electronup.config.ts' || dest === 'package.json' || dest === 'tsconfig.json') {
          const data = getData(template as Template)

          options = {
            ...options,
            jsx: data?.jsx ?? '',
            importer: data?.importer ?? '',
            initializer: data?.initializer ?? '',
            dependencies: data && Object.entries(data.dependencies),
            devDependencies: data && Object.entries(data.devDependencies),
          }
        }

        writeTempl(options)
      }

      // 直接copy
      else { copy(path.join(dirPath, file), targetPath) }
    }
  }

  // eslint-disable-next-line no-console
  console.log(lightGreen(`\nScaffolding project in ${root}...`))

  writeTemplate(baseTemplateDir)

  // 生成render文件夹
  const renderPath = path.join(root, 'render')
  const currentfiles = path.resolve(templateDir, template === 'react-swc' ? 'react' : template)
  if (fs.existsSync(renderPath))
    emptyDir(renderPath)
  else
    fs.mkdirSync(renderPath, { recursive: true })
  // 写入render目录
  writeTemplate(currentfiles, 'render')

  // eslint-disable-next-line no-console
  console.log('\nDone. Now run: \n')

  // 比对路径
  const cdProjectName = path.relative(cwd, root)

  // 创建成功后给出的提示文字
  if (root !== cwd) {
    const cdCommand = `\ncd ${cdProjectName.includes(' ') ? `"${cdProjectName}"` : cdProjectName}\n`

    // eslint-disable-next-line no-console
    console.log(lightGreen(cdCommand))
  }

  const inStallCommand = pkgManager === 'yarn' ? 'yarn' : `${pkgManager} install\n`
  // eslint-disable-next-line no-console
  console.log(lightYellow(inStallCommand))
  const devConmand = pkgManager === 'yarn' ? 'yarn dev' : `${pkgManager} run dev`
  // eslint-disable-next-line no-console
  console.log(lightCyan(devConmand))
}

function formatTargetDir(targetDir: string | undefined) {
  return targetDir?.trim().replace(/\/+$/g, '')
}

function copy(src: string, dest: string) {
  const stat = fs.statSync(src)
  if (stat.isDirectory())
    copyDir(src, dest)
  else fs.copyFileSync(src, dest)
}

// 验证项目名称是否合法
function isValidPackageName(projectName: string | undefined) {
  return /^(?:@[a-z\d\-*~][a-z\d\-*._~]*\/)?[a-z\d\-~][a-z\d\-._~]*$/.test(projectName ?? '')
}

// 违法字符更换
function toValidPackageName(projectName: string) {
  return projectName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/^[._]/, '')
    .replace(/[^a-z\d\-~]+/g, '-')
}

function copyDir(srcDir: string, destDir: string) {
  fs.mkdirSync(destDir, { recursive: true })
  for (const file of fs.readdirSync(srcDir)) {
    const srcFile = path.resolve(srcDir, file)
    const destFile = path.resolve(destDir, file)
    copy(srcFile, destFile)
  }
}

function isEmpty(path: string) {
  const files = fs.readdirSync(path)
  return files.length === 0 || (files.length === 1 && files[0] === '.git')
}

function emptyDir(dir: string) {
  if (!fs.existsSync(dir))
    return

  for (const file of fs.readdirSync(dir)) {
    if (file === '.git')
      continue

    fs.rmSync(path.resolve(dir, file), { recursive: true, force: true })
  }
}

function pkgFromUserAgent(userAgent: string | undefined) {
  if (!userAgent)
    return undefined
  const pkgSpec = userAgent.split(' ')[0]
  const pkgSpecArr = pkgSpec.split('/')
  return {
    name: pkgSpecArr[0],
    version: pkgSpecArr[1],
  }
}

init().catch((e) => {
  console.error(e)
})
