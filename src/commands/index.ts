import type { ExtensionContext } from 'coc.nvim'
import * as coc from 'coc.nvim'
import { registerBuildCommands } from './build'
import { registerEditCommands } from './edit'
import { registerEnvironmentCommands } from './environment'
import { registerTagCommands } from './tags'
import { registerTestCommands } from './test'

export function registerCommands(context: ExtensionContext): void {
  registerTestCommands(context)
  registerBuildCommands(context)
  registerEditCommands(context)
  registerTagCommands(context)
  registerEnvironmentCommands(context)
}

export function registerCommand(
  context: ExtensionContext,
  id: string,
  callback: (...args: any[]) => unknown,
): void {
  context.subscriptions.push(coc.commands.registerCommand(id, callback))
}
