import * as coc from 'coc.nvim'
import type { ExtensionContext } from 'coc.nvim'

export function registerCommand(
  context: ExtensionContext,
  id: string,
  callback: (...args: any[]) => unknown
): void {
  context.subscriptions.push(coc.commands.registerCommand(id, callback))
}
