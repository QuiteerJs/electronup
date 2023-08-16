export type Template = 'vanilla' | 'vue' | 'react' | 'react-swc' | 'svelte' | 'solid'

export function getData(template: Template) {
  switch (template) {
    case 'vanilla':
      return {
        importer: '',
        initializer: '',
        dependencies: { },
        devDependencies: {},
        jsx: 'preserve'
      }
    case 'vue':
      return {
        importer: 'import vue from \'@vitejs/plugin-vue\'',
        initializer: 'vue()',
        dependencies: {
          echarts: '^5.4.2'
        },
        devDependencies: {
          '@vitejs/plugin-vue': '^4.2.3',
          'pinia': '^2.1.6',
          'vue': '^3.3.4',
          'vue-router': '^4.2.2',
          'vue-tsc': '^1.8.1'
        },
        jsx: 'preserve'
      }
    case 'react':
      return {
        importer: 'import react from \'@vitejs/plugin-react\'',
        initializer: 'react()',
        dependencies: {
          'react': '^18.2.0',
          'react-dom': '^18.2.0'
        },
        devDependencies: {
          '@types/react': '^18.2.18',
          '@types/react-dom': '^18.2.7',
          '@vitejs/plugin-react': '^4.0.4',
          'eslint-plugin-react-hooks': '^4.6.0',
          'eslint-plugin-react-refresh': '^0.4.3'
        },
        jsx: 'react-jsx'
      }
    case 'react-swc':
      return {
        importer: 'import reactSwc from \'@vitejs/plugin-react-swc\'',
        initializer: 'reactSwc()',
        dependencies: {
          'react': '^18.2.0',
          'react-dom': '^18.2.0'
        },
        devDependencies: {
          '@types/react': '^18.2.18',
          '@types/react-dom': '^18.2.7',
          '@vitejs/plugin-react-swc': '^3.3.2',
          'eslint-plugin-react-hooks': '^4.6.0',
          'eslint-plugin-react-refresh': '^0.4.3'
        },
        jsx: 'react-jsx'
      }
    case 'solid':
      return {
        importer: 'import solid from \'vite-plugin-solid\'',
        initializer: 'solid()',
        dependencies: {
          'solid-js': '^1.7.9'
        },
        devDependencies: {
          'vite-plugin-solid': '^2.7.0'
        },
        jsx: 'preserve'
      }
  }
}
