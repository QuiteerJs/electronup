import type { BuilderConfig } from '@quiteer/electronup'

/**
 * 框架内置的配置
 * 无需重复配置
 * 在此列出
 */
//  {
//   appId: 'org.quiter.electron-up',
//   productName: packages.name,
//   protocols: {
//     name: packages.name,
//     schemes: ['deeplink']
//   },
//   nsis: {
//     oneClick: false,
//     language: '2052',
//     perMachine: true,
//     allowElevation: true,
//     allowToChangeInstallationDirectory: true,
//     runAfterFinish: true,
//     createDesktopShortcut: true,
//     createStartMenuShortcut: true,
//     artifactName: `${packages.name} \${arch} Setup ${packages.version}.\${ext}`
//   },
//   files: ['dist/**/*'],
//   extraFiles: ['lib'],
//   directories: {
//     output: 'out'
//   }
// }

export default {
  asar: false
} as BuilderConfig
