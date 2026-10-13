import type { ExtensionContext } from 'coc.nvim'
import { Ctx } from './ctx'

let ctx: Ctx | undefined

export async function activate(context: ExtensionContext): Promise<void> {
  ctx = new Ctx(context)
  await ctx.start()
}

export async function deactivate(): Promise<void> {
  ctx?.dispose()
  ctx = undefined
}
