import process from 'node:process'
import { init } from './init'

init()
  .then((code) => {
    process.exitCode = code
  })
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
