import fs from 'node:fs'
import path from 'node:path'
import pc from 'picocolors'

export const remote = 'https://github.com/QuiteerJs/electronup-template.git'

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
