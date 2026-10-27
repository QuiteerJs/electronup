const path = require('path');

const pathFile = path.join(__dirname, 'dist', 'preload.cjs');

function getPreloadPath() {
  return pathFile;
}

module.exports = getPreloadPath();
