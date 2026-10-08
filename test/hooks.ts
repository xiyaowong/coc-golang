import { registerHooks } from 'node:module'

const sourceExtension = /\.(?:[cm]?ts|js|mjs|cjs|json)$/

const redirects = new Map([
  ['coc.nvim', new URL('./fakes/coc-nvim.ts', import.meta.url).href],
  ['node:child_process', new URL('./fakes/child-process.ts', import.meta.url).href],
])

registerHooks({
  resolve(specifier, context, nextResolve) {
    const redirect = redirects.get(specifier)
    if (redirect) return { url: redirect, shortCircuit: true }
    if (specifier.startsWith('.') && !sourceExtension.test(specifier)) {
      return nextResolve(`${specifier}.ts`, context)
    }
    return nextResolve(specifier, context)
  },
})
