#!/usr/bin/env node
/* oxlint-disable no-console */
// 在 playground/electronup-test 里用真 Electron 跑 `electronup dev` , 覆盖 dev 链路 :
// 1. 渲染进程 dev server 可访问 , VITE_ 变量与 --mode 生效
// 2. 主进程拿到 .env / .env.{mode} 注入的变量
// 3. 改主进程源码后重新构建并重启 Electron , 新代码生效
// 4. 改 preload 源码后重新构建并重启 Electron
// 需要先构建 CLI 与模块包 : pnpm --filter electronup build && pnpm modules:build
// Linux 无显示环境下用 xvfb-run 包一层 ; 以 root 运行时设置 ELECTRON_DISABLE_SANDBOX=1
import { spawn } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const cwd = resolve(root, 'playground/electronup-test')
const cli = resolve(root, 'packages/electronup/dist/bin/electronup.mjs')
const mainFile = resolve(cwd, 'main/index.ts')
const preloadFile = resolve(cwd, 'preload/index.ts')
const TIMEOUT = Number(process.env.DEV_E2E_TIMEOUT ?? 90_000)

const originals = new Map([mainFile, preloadFile].map(file => [file, readFileSync(file, 'utf8')]))
let output = ''
const waiters = new Set()

function log(message) {
  console.log(`[dev-e2e] ${message}`)
}

/** 等输出里出现 pattern ( 从 from 偏移处开始找 ) , 返回匹配结果 */
function waitFor(pattern, label, from = 0) {
  return new Promise((resolvePromise, reject) => {
    const check = () => {
      const match = output.slice(from).match(pattern)
      if (match) {
        waiters.delete(check)
        clearTimeout(timer)
        resolvePromise(match)
        return true
      }
      return false
    }
    const timer = setTimeout(() => {
      waiters.delete(check)
      reject(new Error(`等待超时 ( ${TIMEOUT}ms ) : ${label}`))
    }, TIMEOUT)
    if (!check()) { waiters.add(check) }
  })
}

function count(pattern) {
  return output.match(new RegExp(pattern.source, 'g'))?.length ?? 0
}

function assert(condition, message) {
  if (!condition) { throw new Error(`断言失败 : ${message}`) }
  log(`✓ ${message}`)
}

const child = spawn(process.execPath, [cli, 'dev', '--mode', 'staging'], {
  cwd,
  // 独立进程组 , 结束时连同 Electron 一起清理
  detached: process.platform !== 'win32',
  env: { ...process.env, FORCE_COLOR: '0' },
})

for (const stream of [child.stdout, child.stderr]) {
  stream.on('data', (chunk) => {
    const text = chunk.toString()
    process.stdout.write(text)
    output += text
    for (const check of waiters) { check() }
  })
}

let exited = false
let stopping = false
child.on('exit', (code) => {
  exited = true
  for (const check of waiters) { check() }
  if (!stopping && code !== null && code !== 0) { log(`dev 进程提前退出 , code=${code}`) }
})

function stop() {
  if (exited || child.pid === undefined) { return }
  stopping = true
  try {
    if (process.platform === 'win32') { spawn('taskkill', ['/pid', String(child.pid), '/T', '/F']) }
    else { process.kill(-child.pid, 'SIGTERM') }
  }
  catch {}
}

const STARTED = /NODE_ENV development/

try {
  // 1. 首次启动 : 主进程打印 dev server 地址与 env
  const [, port] = await waitFor(/loadUrl:\s+http:\/\/localhost:(\d+)/, '主进程首次启动')
  await waitFor(/VITE_MODE_TEXT :>>\s+(\S+)/, '主进程打印 VITE_MODE_TEXT')
  assert(output.includes('VITE_HELLO :>>  你好！electronup！'), '主进程读到 .env 的 VITE_HELLO')
  assert(output.includes('VITE_MODE_TEXT :>>  这里是预发布|预上线环境'), '主进程读到 .env.staging 的 VITE_MODE_TEXT')

  // 2. 渲染进程 : dev server 可访问 , import.meta.env 带 VITE_ 变量与 mode
  const html = await fetch(`http://localhost:${port}/`).then(res => res.text())
  assert(html.includes('main.ts'), `dev server http://localhost:${port}/ 返回入口页面`)
  const mainModule = await fetch(`http://localhost:${port}/main.ts`).then(res => res.text())
  assert(mainModule.includes('你好！electronup！'), '渲染进程 import.meta.env 包含 VITE_HELLO')
  assert(/"MODE":\s*"staging"/.test(mainModule), '渲染进程 import.meta.env.MODE 为 staging')

  // 3. 改主进程 : 重新构建并重启 , 新代码的输出出现
  let from = output.length
  writeFileSync(mainFile, `${originals.get(mainFile)}\nconsole.log('DEV_E2E_MAIN_RELOADED')\n`)
  await waitFor(/DEV_E2E_MAIN_RELOADED/, '改主进程后 Electron 重启并执行新代码', from)
  await waitFor(STARTED, '重启后的主进程完成启动', from)
  log('✓ 改主进程后 Electron 重启并执行新代码')

  // 4. 改 preload : 重新构建 preload 并重启 Electron ( 主进程再次打印启动日志 )
  const startsBefore = count(STARTED)
  from = output.length
  writeFileSync(preloadFile, `${originals.get(preloadFile)}\nconsole.log('DEV_E2E_PRELOAD_RELOADED')\n`)
  await waitFor(STARTED, '改 preload 后 Electron 重启', from)
  assert(count(STARTED) > startsBefore, '改 preload 后 Electron 重启')
  const preloadOut = readFileSync(resolve(cwd, 'dist/resource/preload.cjs'), 'utf8')
  assert(preloadOut.includes('DEV_E2E_PRELOAD_RELOADED'), 'preload 产物已重新构建')

  assert(!exited, 'dev 进程全程未退出')
  log('全部通过')
}
catch (error) {
  console.error(`\n[dev-e2e] ${error.message}`)
  process.exitCode = 1
}
finally {
  for (const [file, content] of originals) { writeFileSync(file, content) }
  stop()
  // 给进程组一点时间退出 , 避免 xvfb-run 等待残留的 Electron
  setTimeout(() => process.exit(), 1000)
}
