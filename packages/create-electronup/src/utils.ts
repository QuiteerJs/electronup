import fs from 'node:fs'
import path from 'node:path'
import pc from 'picocolors'

export const templateRepo = 'QuiteerJs/electronup-template'

export const remote = `https://github.com/${templateRepo}.git`

/** 镜像地址的环境变量 , 与 --mirror 等价 , 命令行参数优先 */
export const mirrorEnv = 'CREATE_ELECTRONUP_MIRROR'

/**
 * 模板分支的 tar 包地址 . mirror 替换 `https://github.com` 这一段 ,
 * 既支持 `https://kkgithub.com` 这类换域名的镜像 , 也支持 `https://ghfast.top/https://github.com` 这类前缀代理
 */
export function templateTarball(template: string, mirror: string) {
  return `${mirror.replace(/\/+$/, '')}/${templateRepo}/archive/refs/heads/${template}.tar.gz`
}

export const defaultTargetDir = 'electronup-project'

type ColorFunc = (str: string | number) => string
export interface Framework {
  name: string
  display: string
  color: ColorFunc
  variants?: FrameworkVariant[]
}
export interface FrameworkVariant {
  name: string
  display: string
  color: ColorFunc
  customCommand?: string
}

// 每个模板名对应 electronup-template 仓库的同名分支
export const FRAMEWORKS: Framework[] = [
  {
    name: 'vanilla',
    display: 'Vanilla',
    color: pc.yellow,
  },
  {
    name: 'vue',
    display: 'Vue',
    color: pc.green,
  },
  {
    name: 'react',
    display: 'React',
    color: pc.cyan,
    variants: [
      {
        name: 'react',
        display: 'TypeScript',
        color: pc.blue,
      },
      {
        name: 'react-swc',
        display: 'TypeScript + SWC',
        color: pc.blue,
      },
    ],
  },
  {
    name: 'solid',
    display: 'Solid',
    color: pc.blue,
  },
]

export const TEMPLATES = FRAMEWORKS.map(
  f => (f.variants && f.variants.map(v => v.name)) || [f.name],
).reduce((a, b) => a.concat(b), [])

export function formatTargetDir(targetDir: string | undefined) {
  return targetDir?.trim().replace(/\/+$/g, '')
}

export function isEmpty(path: string) {
  const files = fs.readdirSync(path)
  return files.length === 0 || (files.length === 1 && files[0] === '.git')
}

export function emptyDir(dir: string) {
  if (!fs.existsSync(dir))
    {return}

  for (const file of fs.readdirSync(dir)) {
    if (file === '.git')
      {continue}

    fs.rmSync(path.resolve(dir, file), { recursive: true, force: true })
  }
}

export function pkgFromUserAgent(userAgent: string | undefined) {
  if (!userAgent)
    {return undefined}
  const pkgSpec = userAgent.split(' ')[0]
  const pkgSpecArr = pkgSpec.split('/')
  return {
    name: pkgSpecArr[0],
    version: pkgSpecArr[1],
  }
}

export function isValidPackageName(projectName: string) {
  return /^(?:@[a-z\d\-*~][a-z\d\-*._~]*\/)?[a-z\d\-~][a-z\d\-._~]*$/.test(projectName)
}

// 目录名不一定是合法包名 , 规整后写入 package.json#name ( electron-builder 据此生成 appId )
export function toValidPackageName(projectName: string) {
  return projectName
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/^[._]/, '')
    .replace(/[^a-z\d\-~]+/g, '-')
    .replace(/^-+|-+$/g, '')
    || defaultTargetDir
}

export const helpMessage = `\
用法：create-electronup [项目目录] [选项]

基于 electronup 创建 Electron 项目。不传参数时进入交互模式。

选项：
  -t, --template 模板名      使用指定模板，跳过选择
  --overwrite               目标目录不为空时直接清空（保留 .git），不再询问
  --mirror 地址             通过 GitHub 镜像拉取模板，替换 https://github.com 这一段，
                            如 https://kkgithub.com ；也可用环境变量 ${mirrorEnv}
  -h, --help                显示帮助

可用模板：
${TEMPLATES.map(t => `  ${t}`).join('\n')}`
