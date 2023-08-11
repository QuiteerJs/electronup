import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import minimist from 'minimist'
import prompts from 'prompts'
import ejs from 'ejs'
import { blue, cyan, green, lightBlue, lightGreen, lightRed, magenta, red, reset, yellow } from 'kolorist'
import templateData from './template.json'

// Avoids autoconversion to number of the project name by defining that the args
// non associated with an option ( _ ) needs to be parsed as a string. See #4606
const argv = minimist(process.argv.slice(2), { string: ['_'] })

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
    color: yellow
  },
  {
    name: 'vue',
    display: 'Vue + TS',
    color: green
  },
  {
    name: 'react',
    display: 'React + TS',
    color: cyan,
    variants: [
      {
        name: 'react',
        display: 'TypeScript',
        color: lightBlue
      },
      {
        name: 'react-swc',
        display: 'TypeScript + SWC',
        color: blue
      }
    ]
  }
  // ,{
  //   name: 'preact',
  //   display: 'Preact + TS',
  //   color: magenta
  // },
  // {
  //   name: 'svelte',
  //   display: 'Svelte + TS',
  //   color: lightRed
  // },
  // {
  //   name: 'solid',
  //   display: 'Solid + TS',
  //   color: blue
  // }
]

const renameFiles: Record<string, string | undefined> = {
  _gitignore: '.gitignore',
  _npmrc: '.npmrc'
}

const defaultTargetDir = 'electronup-project'

async function init() {
  const argTargetDir = formatTargetDir(argv._[0])

  let targetDir = argTargetDir || defaultTargetDir
  const getProjectName = () => (targetDir === '.' ? path.basename(path.resolve()) : targetDir)

  let result: prompts.Answers<'projectName' | 'overwrite' | 'packageName' | 'framework' | 'variant'>

  try {
    result = await prompts(
      [
        // 没有输入项目名称触发
        {
          type: argTargetDir ? null : 'text',
          name: 'projectName',
          message: reset('Project name:'),
          initial: defaultTargetDir,
          onState: (state) => {
            targetDir = formatTargetDir(state.value) || defaultTargetDir
          }
        },
        // 存在当前目录或者目录为空触发选择项
        // 提示文字
        // 当前目录下创建项目模板
        // 当前目录不为空 是否删除或者跳过
        {
          type: () => (!fs.existsSync(targetDir) || isEmpty(targetDir) ? null : 'confirm'),
          name: 'overwrite',
          message: () => `${targetDir === '.' ? 'Current directory' : `Target directory "${targetDir}"`} is not empty. Remove existing files and continue?`
        },
        // 中止程序关节
        {
          type: (_, { overwrite }: { overwrite?: boolean }) => {
            if (overwrite === false) {
              // 终止当前程序
              throw new Error(`${red('✖')} Operation cancelled`)
            }

            return null
          },
          name: 'overwriteChecker'
        },
        // 验证输入的项目名称是否合法
        // 合法 -> 跳过
        // 不合法 -> 重新输入
        {
          type: () => (isValidPackageName(getProjectName()) ? null : 'text'),
          name: 'packageName',
          message: reset('Package name:'),
          initial: () => toValidPackageName(getProjectName()),
          validate: dir => isValidPackageName(dir) || 'Invalid package.json name'
        },
        // 选择预置模板
        {
          type: 'select',
          name: 'framework',
          message: reset('Select a framework:'),
          initial: 0,
          choices: FRAMEWORKS.map((framework) => {
            const frameworkColor = framework.color
            return {
              title: frameworkColor(framework.display || framework.name),
              value: framework
            }
          })
        },
        // 选择语言类型
        {
          type: (framework: Framework) => (framework && framework.variants ? 'select' : null),
          name: 'variant',
          message: reset('Select a variant:'),
          choices: (framework: Framework) =>
            framework.variants?.map((variant) => {
              const variantColor = variant.color
              return {
                title: variantColor(variant.display || variant.name),
                value: variant.name
              }
            })
        }
      ],
      {
        onCancel: () => {
          throw new Error(`${red('✖')} Operation cancelled`)
        }
      }
    )
  }
  catch (cancelled: any) {
    // eslint-disable-next-line no-console
    console.log(cancelled.message)
    return
  }

  // 用户选择与提示相关联
  // user choice associated with prompts
  const { framework, overwrite, packageName, variant } = result

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
  const template: string = variant || framework?.name

  // eslint-disable-next-line no-console
  console.log(lightGreen(`\nScaffolding project in ${root}...`))

  // 返回模板所在路径
  const templateDir = path.resolve(fileURLToPath(import.meta.url), '../..', 'template')

  // 默认模板
  const baseTemplateDir = path.resolve(templateDir, 'base')

  const currentTemplateDir = path.resolve(templateDir, template)
  console.log('currentTemplateDir: ', currentTemplateDir)

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
        console.log('file :>> ', file)
        const filepath = path.resolve(dirPath, file)
        const dest = file.replace(/\.ejs$/, '')
        console.log('dest: ', dest)
        targetPath = path.join(root, dir, dest)

        const writeTempl = (options: Record<string, any>) => {
          console.log('options: ', options)
          const templateContent = fs.readFileSync(filepath, 'utf-8')
          console.log('templateContent: ', templateContent)
          const content = ejs.render(templateContent, options)

          console.log('targetPath: ', targetPath)
          fs.writeFileSync(targetPath, content)
        }

        if (dest.includes('.eslintrc'))
          writeTempl({ template })

        if (dest.includes('.npmrc'))
          writeTempl({ pnpm: pkgManager === 'pnpm' })

        if (dest.includes('package.json')) {
          const options = templateData?.[dest]?.find(item => item.id === template)
          writeTempl({
            name: packageName,
            dependencies: options && Object.entries(options.dependencies),
            devDependencies: options && Object.entries(options.devDependencies)
          })
        }

        if (dest.includes('electronup')) {
          const options = templateData?.[dest]?.find(item => item.id === template)
          writeTempl({
            name: packageName,
            importer: options?.importer ?? '',
            initializer: options?.initializer ?? ''
          })
        }

        if (dest.includes('tsconfig')) {
          const options = templateData?.[dest]?.find(item => item.id === template)
          writeTempl({ jsx: options?.jsx })
        }
      }

      // 直接copy
      else { copy(path.join(dirPath, file), targetPath) }
    }
  }

  writeTemplate(baseTemplateDir)

  // 生成render文件夹
  const renderPath = path.join(root, 'render')
  const currentfiles = path.resolve(templateDir, template)
  if (fs.existsSync(renderPath))
    emptyDir(renderPath)
  else
    fs.mkdirSync(renderPath, { recursive: true })
  // 写入render目录
  writeTemplate(currentfiles, 'render')

  if (template === 'vanilla')
    return
  // 比对路径
  const cdProjectName = path.relative(cwd, root)

  // 创建成功后给出的提示文字
  // eslint-disable-next-line no-console
  console.log('\nDone. Now run:\n')

  if (root !== cwd) {
    // eslint-disable-next-line no-console
    console.log(
      `  cd ${
        cdProjectName.includes(' ') ? `"${cdProjectName}"` : cdProjectName
      }`
    )
  }

  switch (pkgManager) {
    case 'yarn':
    // eslint-disable-next-line no-console
      console.log('  yarn')
      // eslint-disable-next-line no-console
      console.log('  yarn dev')
      break
    default:
    // eslint-disable-next-line no-console
      console.log(`  ${pkgManager} install`)
      // eslint-disable-next-line no-console
      console.log(`  ${pkgManager} run dev`)
      break
  }
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
function isValidPackageName(projectName: string) {
  return /^(?:@[a-z\d\-*~][a-z\d\-*._~]*\/)?[a-z\d\-~][a-z\d\-._~]*$/.test(projectName)
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
    version: pkgSpecArr[1]
  }
}

init().catch((e) => {
  console.error(e)
})
