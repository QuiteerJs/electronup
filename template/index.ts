import { $, fs, path } from 'zx'

async function createTemplate() {
  await $`pnpm create:vanilla && pnpm create:vue && pnpm create:react && pnpm create:react-swc && pnpm create:solid`

  // 读取目录下的目录
  const directories = fs.readdirSync(__dirname, { withFileTypes: true }).filter(dirent => dirent.isDirectory() && !dirent.name.startsWith('node_modules'))

  // 重写 electronup 的版本
  directories.forEach(async (dir) => {
    const packageJsonPath = path.join(__dirname, dir.name, 'package.json')
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
    packageJson.devDependencies.electronup = 'workspace:^'
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2))
  })
}

createTemplate()
