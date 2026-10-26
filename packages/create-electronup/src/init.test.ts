import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import * as prompts from '@clack/prompts'
import degit from 'degit'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { init } from './init'
import { FRAMEWORKS, remote } from './utils'

const CANCEL = Symbol('cancel')

vi.mock('@clack/prompts', () => ({
  text: vi.fn(),
  confirm: vi.fn(),
  select: vi.fn(),
  isCancel: vi.fn((value: unknown) => value === CANCEL),
  spinner: vi.fn(() => ({ start: vi.fn(), stop: vi.fn(), error: vi.fn() })),
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
  // 未消费的 mockResolvedValueOnce 不能串到下一个用例
  vi.mocked(prompts.text).mockReset()
  vi.mocked(prompts.confirm).mockReset()
  vi.mocked(prompts.select).mockReset()
  vi.clearAllMocks()
  vi.restoreAllMocks()
  fs.rmSync(cwd, { recursive: true, force: true })
})

function readPkg(dir: string) {
  return JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'))
}

describe('init', () => {
  it('传入项目名与模板时无需交互 , 生成到目标目录', async () => {
    expect(await run(['my-app', '--template', 'vue'])).toBe(0)

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
    expect(output).toContain('pnpm dev')
    expect(output).not.toContain('corepack')
  })

  it.each(['vanilla', 'vue', 'react', 'react-swc', 'solid'])('-t %s 直接拉取对应分支 , 不再询问', async (template) => {
    await run(['app', '-t', template])
    expect(prompts.select).not.toHaveBeenCalled()
    expect(degit).toHaveBeenCalledWith(`${remote}#${template}`, expect.any(Object))
  })

  it('交互选择 react 后再选择变体', async () => {
    const react = FRAMEWORKS.find(f => f.name === 'react')
    vi.mocked(prompts.select).mockResolvedValueOnce(react).mockResolvedValueOnce('react-swc')

    await run(['app'])

    expect(prompts.select).toHaveBeenCalledTimes(2)
    expect(degit).toHaveBeenCalledWith(`${remote}#react-swc`, expect.any(Object))
  })

  it('无效模板时提示重新选择', async () => {
    const solid = FRAMEWORKS.find(f => f.name === 'solid')
    vi.mocked(prompts.select).mockResolvedValueOnce(solid)

    await run(['app', '-t', 'angular'])

    expect(vi.mocked(prompts.select).mock.calls[0][0].message).toContain('"angular" 不是有效模板')
    expect(degit).toHaveBeenCalledWith(`${remote}#solid`, expect.any(Object))
  })

  it('未传项目名时询问 , 留空使用默认目录', async () => {
    vi.mocked(prompts.text).mockResolvedValueOnce('')

    await run(['-t', 'vanilla'])

    expect(prompts.text).toHaveBeenCalledTimes(1)
    expect(readPkg(path.join(cwd, 'electronup-project')).name).toBe('electronup-project')
  })

  it('把 package.json#name 改写为项目目录名 , 并保留其余字段', async () => {
    await run(['my-app', '-t', 'vue'])
    expect(readPkg(path.join(cwd, 'my-app'))).toEqual({ name: 'my-app', main: 'dist/resource/electron.cjs' })
  })

  it('目录名不是合法包名时规整后写入', async () => {
    await run(['nested/My App', '-t', 'vue'])
    expect(readPkg(path.join(cwd, 'nested/My App')).name).toBe('my-app')
  })

  it('在当前目录生成时使用当前目录名 , 不提示 cd', async () => {
    const dir = path.join(cwd, 'current-app')
    fs.mkdirSync(dir)
    await init({ args: ['.', '-t', 'vanilla'], cwd: dir, userAgent: 'pnpm/10.30.3' })

    expect(readPkg(dir).name).toBe('current-app')
    expect(logs.join('\n')).not.toContain('cd ')
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

  it('--overwrite 时不询问直接清空', async () => {
    const target = path.join(cwd, 'app')
    fs.mkdirSync(target)
    fs.writeFileSync(path.join(target, 'old.txt'), 'old')

    expect(await run(['app', '-t', 'vue', '--overwrite'])).toBe(0)

    expect(prompts.confirm).not.toHaveBeenCalled()
    expect(degit).toHaveBeenCalledWith(`${remote}#vue`, { cache: false, force: true })
    expect(fs.existsSync(path.join(target, 'old.txt'))).toBe(false)
  })

  it('目标目录非空且拒绝清空时 , 不改动任何文件并返回 1', async () => {
    const target = path.join(cwd, 'app')
    fs.mkdirSync(target)
    fs.writeFileSync(path.join(target, 'old.txt'), 'old')
    vi.mocked(prompts.confirm).mockResolvedValueOnce(false)

    expect(await run(['app', '-t', 'vue'])).toBe(1)

    expect(degit).not.toHaveBeenCalled()
    expect(fs.readdirSync(target)).toEqual(['old.txt'])
    expect(logs.join('\n')).toContain('Operation cancelled')
  })

  it('取消输入项目名时直接退出并返回 1', async () => {
    vi.mocked(prompts.text).mockResolvedValueOnce(CANCEL as any)

    expect(await run([])).toBe(1)

    expect(degit).not.toHaveBeenCalled()
    expect(fs.readdirSync(cwd)).toEqual([])
  })

  it('模板拉取失败时给出手动克隆提示并返回 1', async () => {
    const errors: string[] = []
    vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
      errors.push(args.join(' '))
    })
    vi.mocked(degit).mockImplementationOnce(() => ({
      clone: vi.fn(async () => {
        throw new Error('could not download')
      }),
    }))

    expect(await run(['app', '-t', 'vue'])).toBe(1)

    const output = errors.join('\n')
    expect(output).toContain('could not download')
    expect(output).toContain(`git clone -b vue --depth 1 ${remote} app`)
    expect(logs.join('\n')).not.toContain('pnpm install')
  })

  it.each(['npm/10.9.0 node/v24.12.0', 'yarn/1.22.22 npm/? node/v24.12.0'])('用 %s 创建时仍提示 pnpm 并说明原因', async (userAgent) => {
    await run(['app', '-t', 'vue'], userAgent)

    const output = logs.join('\n')
    expect(output).toContain('pnpm install')
    expect(output).toContain('corepack enable')
    expect(output).not.toMatch(/(?<![a-z])(npm|yarn) (install|run dev)/)
  })

  it('--help 打印用法后返回 0 , 不创建任何文件', async () => {
    expect(await run(['--help'])).toBe(0)
    expect(await run(['-h'])).toBe(0)

    expect(logs.join('\n')).toContain('--overwrite')
    expect(degit).not.toHaveBeenCalled()
    expect(fs.readdirSync(cwd)).toEqual([])
  })
})
