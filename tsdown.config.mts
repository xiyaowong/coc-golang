import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts', 'src/go-test-utils.ts'],
  outDir: 'lib',
  format: 'cjs',
  target: 'node20',
  platform: 'node',
  minify: false,
  dts: false,
  deps: {
    neverBundle: ['coc.nvim'],
    onlyBundle: false,
  },
  outExtensions: () => ({ js: '.js' }),
})
