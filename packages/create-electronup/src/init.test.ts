import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import * as prompts from '@clack/prompts'
import degit from 'degit'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { init } from './init'
import { remote } from './utils'

const CANCEL = Symbol('cancel')

vi.mock('@clack/prompts', () => ({
  text: vi.fn(),
  confirm: vi.fn(),
  select: vi.fn(),
  isCancel: vi.fn((value: unknown) => value === CANCEL),
  spinner: vi.fn(() => ({ start: vi.fn(), stop: vi.fn() })),
}))

// 用本地写文件模拟 degit 拉取 , 测试不访问网络
vi.mock('degit', () => ({
  default: vi.fn((src: string) => ({
    clone: vi.fn(async (dest: string) => {
      const branch = src.split('#')[1]
      const files: Record<string, string> = {
        'package.json': JSON.stringify({ name: 'electronup-template', main: 'dist/resource/electron.cjs' }),
        'electronup.config.ts': `// ${branch}\n`,
        'main/index.ts': '',
        'render/index.html': '',
      }
      for (const [file, content] of Object.entries(files)) {
        fs.mkdirSync(path.dirname(path.join(dest, file)), { recursive: true })
        fs.writeFileSync(path.join(dest, file), content)
      }
    }),
  })),
}))

let cwd: string
let logs: string[]

function listFiles(dir: string, base = dir): string[] {
  return fs.readdirSync(dir, { withFileTypes: true })
    .flatMap(entry => entry.isDirectory()
      ? listFiles(path.join(dir, entry.name), base)
      : [path.relative(base, path.join(dir, entry.name)).split(path.sep).join('/')])
    .toSorted()
}

function run(args: string[], userAgent = 'pnpm/10.30.3 npm/? node/v24.12.0 linux x64') {
  return init({ args, cwd, userAgent })
}

beforeEach(() => {
  cwd = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'create-electronup-init-')))
  logs = []
  vi.spyOn(console, 'log').mockImplementation((...args: unknown[]) => {
    logs.push(args.join(' '))
  })
})

afterEach(() => {
  vi.clearAllMocks()
  vi.restoreAllMocks()
  fs.rmSync(cwd, { recursive: true, force: true })
})

describe('init', () => {
  it('传入项目名与模板时无需交互 , 生成到目标目录', async () => {
    await run(['my-app', '--template', 'vue'])

    expect(prompts.text).not.toHaveBeenCalled()
    expect(prompts.select).not.toHaveBeenCalled()
    expect(degit).toHaveBeenCalledWith(`${remote}#vue`, { cache: false, force: false })
    expect(listFiles(path.join(cwd, 'my-app'))).toEqual([
      'electronup.config.ts',
      'main/index.ts',
      'package.json',
      'render/index.html',
    ])
    expect(fs.readFileSync(path.join(cwd, 'my-app/electronup.config.ts'), 'utf8')).toBe('// vue\n')

    const output = logs.join('\n')
    expect(output).toContain('cd my-app')
    expect(output).toContain('pnpm install')
    expect(output).toContain('pnpm run dev')
  })

  it.each(['vanilla', 'vue', 'react-swc', 'solid'])('-t %s 拉取对应分支', async (template) => {
    await run(['app', '-t', template])
    expect(degit).toHaveBeenCalledWith(`${remote}#${template}`, expect.any(Object))
  })

  it('react 需要再选择变体', async () => {
    vi.mocked(prompts.select).mockResolvedValueOnce('react-swc')

    await run(['app', '-t', 'react'])

    expect(prompts.select).toHaveBeenCalledTimes(1)
    expect(degit).toHaveBeenCalledWith(`${remote}#react-swc`, expect.any(Object))
  })

  it('无效模板时提示重新选择', async () => {
    const solid = (await import('./utils')).FRAMEWORKS.find(f => f.name === 'solid')
    vi.mocked(prompts.select).mockResolvedValueOnce(solid)

    await run(['app', '-t', 'angular'])

    expect(vi.mocked(prompts.select).mock.calls[0][0].message).toContain('"angular" 不是有效模板')
    expect(degit).toHaveBeenCalledWith(`${remote}#solid`, expect.any(Object))
  })

  it('未传项目名时询问 , 留空使用默认目录', async () => {
    vi.mocked(prompts.text).mockResolvedValueOnce('')

    await run(['-t', 'vanilla'])

    expect(prompts.text).toHaveBeenCalledTimes(1)
    expect(fs.existsSync(path.join(cwd, 'electronup-project/package.json'))).toBe(true)
  })

  it('目标目录非空且确认清空时 , 保留 .git 并强制覆盖', async () => {
    const target = path.join(cwd, 'app')
    fs.mkdirSync(path.join(target, '.git'), { recursive: true })
    fs.writeFileSync(path.join(target, 'old.txt'), 'old')
    vi.mocked(prompts.confirm).mockResolvedValueOnce(true)

    await run(['app', '-t', 'vue'])

    expect(degit).toHaveBeenCalledWith(`${remote}#vue`, { cache: false, force: true })
    expect(fs.existsSync(path.join(target, 'old.txt'))).toBe(false)
    expect(fs.existsSync(path.join(target, '.git'))).toBe(true)
    expect(fs.existsSync(path.join(target, 'package.json'))).toBe(true)
  })

  it('目标目录非空且拒绝清空时 , 不改动任何文件', async () => {
    const target = path.join(cwd, 'app')
    fs.mkdirSync(target)
    fs.writeFileSync(path.join(target, 'old.txt'), 'old')
    vi.mocked(prompts.confirm).mockResolvedValueOnce(false)

    await run(['app', '-t', 'vue'])

    expect(degit).not.toHaveBeenCalled()
    expect(fs.readdirSync(target)).toEqual(['old.txt'])
    expect(logs.join('\n')).toContain('Operation cancelled')
  })

  it('取消输入项目名时直接退出', async () => {
    vi.mocked(prompts.text).mockResolvedValueOnce(CANCEL as any)

    await run([])

    expect(degit).not.toHaveBeenCalled()
    expect(fs.readdirSync(cwd)).toEqual([])
  })

  it('在当前目录生成时不提示 cd , yarn 使用 yarn 命令', async () => {
    await run(['.', '-t', 'vanilla'], 'yarn/1.22.22 npm/? node/v24.12.0 linux x64')

    expect(fs.existsSync(path.join(cwd, 'package.json'))).toBe(true)
    const output = logs.join('\n')
    expect(output).not.toContain('cd ')
    expect(output).toContain('yarn dev')
  })

  it('没有 user agent 时默认提示 npm', async () => {
    await init({ args: ['app', '-t', 'vue'], cwd, userAgent: '' })
    expect(logs.join('\n')).toContain('npm install')
  })
})
