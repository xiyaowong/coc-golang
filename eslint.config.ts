import wongxy from '@wongxy/eslint-config'

export default wongxy(
  {
    rules: {
      'node/prefer-global/process': 'off',
    },
  },
  {
    files: ['test/**'],
    rules: {
      'test/no-import-node-test': 'off',
    },
  },
)
