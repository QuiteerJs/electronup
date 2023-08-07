import { join } from 'node:path'
import type { ExecaSyncReturnValue, SyncOptions } from 'execa'
import { execaCommandSync } from 'execa'
import fs from 'fs-extra'
import { afterEach, beforeAll, expect, test } from 'vitest'

const CLI_PATH = join(__dirname, '..')

const projectName = 'test-app'
const genPath = join(__dirname, projectName)

const run = (
  args: string[],
  options: SyncOptions = {}
): ExecaSyncReturnValue => {
  return execaCommandSync(`node ${CLI_PATH} ${args.join(' ')}`, options)
}

// Helper to create a non-empty directory
// 创建一个非空目录的助手
const createNonEmptyDir = () => {
  // Create the temporary directory
  // 创建临时目录
  fs.mkdirpSync(genPath)

  // Create a package.json file
  // 创建一个 package.json 文件
  const pkgJson = join(genPath, 'package.json')
  fs.writeFileSync(pkgJson, '{ "foo": "bar" }')
}

beforeAll(() => fs.remove(genPath))
afterEach(() => fs.remove(genPath))

// 如果未提供项目名称，则提示输入项目名称
test('prompts for the project name if none supplied', () => {
  const { stdout } = run([])
  console.log('stdout: ', stdout)
  expect(stdout).toContain('Project name:')
})

// 当目标目录为当前目录时，如果没有提供框架提示
test('prompts for the framework if none supplied when target dir is current directory', () => {
  fs.mkdirpSync(genPath)
  const { stdout } = run(['.'], { cwd: genPath })
  expect(stdout).toContain('Select a framework:')
})

// 如果没有提供，则提示输入框架
test('prompts for the framework if none supplied', () => {
  const { stdout } = run([projectName])
  expect(stdout).toContain('Select a framework:')
})

// 要求覆盖非空目标目录
test('asks to overwrite non-empty target directory', () => {
  createNonEmptyDir()
  const { stdout } = run([projectName], { cwd: __dirname })
  expect(stdout).toContain(`Target directory "${projectName}" is not empty.`)
})

// 要求覆盖非空的当前目录
test('asks to overwrite non-empty current directory', () => {
  createNonEmptyDir()
  const { stdout } = run(['.'], { cwd: genPath })
  expect(stdout).toContain('Current directory is not empty.')
})

