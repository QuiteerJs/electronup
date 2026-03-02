import antfu from '@antfu/eslint-config'

export default antfu(
  {
    rules: {
      'no-console': ['warn', { allow: ['info', 'warn', 'error', 'time', 'timeEnd'] }],
      'no-unused-vars': ['warn', { varsIgnorePattern: '^_' }],
      'unused-imports/no-unused-vars': ['warn', {
        varsIgnorePattern: '^_',
        argsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      'antfu/no-import-dist': 'warn',
    },
  },
  {
    ignores: [
      'create-electronup',
      'dist',
      'temp',
      'node_modules',
      '**/*.md',
      'docs/.vitepress/cache',
      '.github',
      '*.ejs',
    ],
  },
)
