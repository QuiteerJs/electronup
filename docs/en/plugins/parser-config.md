---
title: parser-config
---

# @quiteer/parser-config

> Reads user config files with the extensions `ts`, `mjs`, `js`, `cjs`, `json` and `yaml` from a project.

## Install

```bash
npm i @quiteer/parser-config -D
```

```bash
yarn add @quiteer/parser-config -D
```

```bash
pnpm add @quiteer/parser-config -D
```

## Usage

`configPath`: an exact file path or a directory. When omitted, the current working directory is used. (Pass `undefined` when specifying `configName`.)

`configName`: optional. When provided, pass a directory and the matching config file is resolved automatically across extensions.

```ts
import { resolve } from 'path'
import { parserConfig } from '@quiteer/parser-config'

const filePath = (path: string) => resolve(resolve(), path)

const cjs = filePath('./test-cjs/config.cjs')
const js = filePath('./test-js/config.js')
const json = filePath('./test-json/config.json')
const mjs = filePath('./test-mjs/config.mjs')
const ts = filePath('./test-ts/config.ts')
const yaml = filePath('./test-yaml/config.yaml')

const test = async () => {
  const yamlConfig = await parserConfig(yaml)
  console.log('yamlConfig: ', yamlConfig)

  const jsonConfig = await parserConfig(json)
  console.log('jsonConfig: ', jsonConfig)

  const mjsConfig = await parserConfig(mjs)
  console.log('mjsConfig: ', mjsConfig)

  const jsConfig = await parserConfig(js)
  console.log('jsConfig: ', jsConfig)

  const cjsConfig = await parserConfig(cjs)
  console.log('cjsConfig: ', cjsConfig)

  const tsConfig = await parserConfig(ts)
  console.log('tsConfig: ', tsConfig)

  const rootConfig = await parserConfig(undefined, 'config')
  console.log('rootConfig: ', rootConfig)

  const electronup = await parserConfig(undefined, 'electronup.config')
  console.log('electronup: ', JSON.stringify(electronup))
}
test()
```

## API

```ts
/**
 * @param configPath  Path of the config file or its directory
 * @param configName  Optional config file name
 */
declare function parserConfig(configPath?: string, configName?: string): Promise<any>

export { parserConfig }
```

## Extension priority

`ts` > `mjs` > `cjs` > `js` > `json` > `yaml`
