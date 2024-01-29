module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    '@quiteer/eslint-config',
    'plugin:react-hooks/recommended'
  ],
  ignorePatterns: ['dist'],
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true }
    ]
  }
}
