import path from 'path'
import { Arch, Platform, build as builder } from 'electron-builder'
import { build as viteBuild } from 'vite'
import { build as tsBuild } from 'tsup'

import inquirer from 'inquirer'
import { stringify } from 'yaml'
import { writeFile } from 'fs-extra'
import type { ElectronupConfig } from '../typings/electronup'
import { electronupConfig } from '../transform'
import { DefaultDirs, store } from '../utils'

export async function build(options: ElectronupConfig) {
  if (store.option) {
    const { isMinify } = await inquirer
      .prompt([{ type: 'confirm', name: 'isMinify', message: '是否压缩代码?' }])
      .catch((err) => {
        console.error('err: ', err)
        process.exit(1)
      })

    store.minify = isMinify

    const { isPackage } = await inquirer
      .prompt([{ type: 'confirm', name: 'isPackage', message: '是否生成安装包?' }])
      .catch((err) => {
        console.error('err: ', err)
        process.exit(1)
      })

    store.dir = !isPackage

    if (store.isWin) {
      if (store.currentArch === 'ia32')
        store.ia32 = true

      if (store.currentArch === 'x64') {
        const { pattern } = await inquirer
          .prompt([
            {
              type: 'checkbox',
              name: 'pattern',
              message: '请选择构建模式 , 跳过选择为当前操作系统平台 ~',
              pageSize: 10,
              choices: [
                { name: 'win-x64', value: 'x64' },
                { name: 'win-ia32', value: 'ia32' }
              ]
            }
          ])
          .catch((err) => {
            console.error('err: ', err)
            process.exit(1)
          })

        if (pattern.length) {
          pattern.forEach((arch: 'x64' | 'ia32') => {
            store[arch] = true
          })
        }
      }
      store.dir = !isPackage
    }

    if (store.isMac) {
      const { outPlatform } = await inquirer
        .prompt([
          {
            type: 'list',
            name: 'outPlatform',
            message: '请选择构建平台 , 跳过选择为当前操作系统平台 ~',
            pageSize: 10,
            choices: [
              { name: 'win', value: 'win' },
              { name: 'mac', value: 'mac' },
              { name: 'linux', value: 'linux' }
            ]
          }
        ])
        .catch((err) => {
          console.error('err: ', err)
          process.exit(1)
        })

      if (outPlatform === 'mac') {
        const { pattern } = await inquirer
          .prompt([
            {
              type: 'checkbox',
              name: 'pattern',
              message: '请选择构建模式 , 跳过选择为当前操作系统平台 ~',
              pageSize: 10,
              choices: [
                { name: 'mac-x64', value: Arch.x64 },
                { name: 'mac-arm64', value: Arch.arm64 }
              ]
            }
          ])
          .catch((err) => {
            console.error('err: ', err)
            process.exit(1)
          })

        const archList = []
        pattern.length ? archList.push(...pattern) : archList.push(Arch[store.currentArch])
        store.targets = Platform.MAC.createTarget(!isPackage ? 'dir' : null, ...archList)
      }

      if (outPlatform === 'win') {
        const { pattern } = await inquirer
          .prompt([
            {
              type: 'checkbox',
              name: 'pattern',
              message: '请选择构建模式 , 跳过选择为当前操作系统平台 ~',
              pageSize: 10,
              choices: [
                { name: 'win-x64', value: Arch.x64 },
                { name: 'win-ia32', value: Arch.ia32 }
              ]
            }
          ])
          .catch((err) => {
            console.error('err: ', err)
            process.exit(1)
          })

        const archList = []
        pattern.length ? archList.push(...pattern) : archList.push(Arch.x64)
        store.targets = Platform.WINDOWS.createTarget(!isPackage ? 'dir' : null, ...archList)
      }

      if (outPlatform === 'linux')
        store.targets = Platform.LINUX.createTarget(!isPackage ? 'dir' : null, Arch.armv7l)
    }

    if (store.isLinux) {
      //
    }
  }

  const initConfig = await electronupConfig(options)

  await viteBuild(initConfig.vite)
  await tsBuild(initConfig.tsup)

  await builder(initConfig.builder)

  await writeFile(
    path.resolve(store.root, options.outDir || DefaultDirs.outDir, 'electronup-effective-config.yaml'),
    stringify(JSON.parse(JSON.stringify(initConfig)))
  )
}
