import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['src/index.ts'],
  outDir: 'lib',
  format: 'esm',
  target: 'node22',
  platform: 'node',
  minify: false,
  dts: false,
  deps: {
    neverBundle: ['coc.nvim'],
    onlyBundle: false,
  },
  outExtensions: () => ({ js: '.js' }),
})
