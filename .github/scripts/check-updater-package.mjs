import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createReadStream, readFileSync, realpathSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path'
import process from 'node:process'

// 示例使用 asar: false ; 从打包后的主进程位置解析 , 不能误用工作区里的依赖
const [resourcesArg, expectedUrl, metadataPath] = process.argv.slice(2)
assert.ok(resourcesArg, '需要 resources 目录')
const resources = resolve(resourcesArg)
const appRoot = realpathSync(resolve(resources, 'app'))
const pkg = JSON.parse(readFileSync(resolve(appRoot, 'package.json'), 'utf8'))
assert.ok(pkg.dependencies?.['electron-updater'], 'electron-updater 必须是应用的生产依赖')

const main = resolve(appRoot, pkg.main)
const requireFromApp = createRequire(main)
const updaterPath = realpathSync(requireFromApp.resolve('electron-updater'))
const relativeUpdater = relative(appRoot, updaterPath)
assert.ok(!isAbsolute(relativeUpdater) && relativeUpdater !== '..' && !relativeUpdater.startsWith(`..${sep}`), '更新器必须位于打包后的应用内')
assert.doesNotMatch(readFileSync(main, 'utf8'), /require\s*\(\s*['"`]electronup['"`]\s*\)/, '更新辅助代码必须内联到主进程')

// 只加载模块 , 不读取 autoUpdater getter , 不启动 Electron 或发起网络请求
const updaterModule = requireFromApp('electron-updater')
assert.equal(typeof updaterModule.AppUpdater, 'function')
// Windows / macOS 的 --dir 不生成更新配置 ; 安装包构建才验证更新源与元数据
if (expectedUrl) {
  const requireFromUpdater = createRequire(updaterPath)
  const { load } = requireFromUpdater('js-yaml')
  const config = load(readFileSync(resolve(resources, 'app-update.yml'), 'utf8'))
  assert.equal(config.provider, 'generic')
  assert.equal(config.url, expectedUrl)
  assert.ok(metadataPath, '需要更新元数据文件路径')
  const metadata = load(readFileSync(metadataPath, 'utf8'))
  assert.equal(metadata.version, pkg.version)
  assert.ok(metadata.files?.length > 0, '更新元数据必须包含安装包信息')
  for (const file of metadata.files) {
    const artifact = resolve(dirname(metadataPath), decodeURIComponent(file.url))
    assert.equal(statSync(artifact).size, file.size, '安装包大小必须与更新元数据一致')
    const hash = createHash('sha512')
    for await (const chunk of createReadStream(artifact))
      {hash.update(chunk)}
    assert.equal(hash.digest('base64'), file.sha512, '安装包哈希必须与更新元数据一致')
  }
}
