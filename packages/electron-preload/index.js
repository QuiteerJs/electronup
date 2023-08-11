const path = require('path')

const pathFile = path.join(__dirname, 'dist', 'preload.js')

function getPreloadPath() {
  return pathFile
}

module.exports = getPreloadPath()

