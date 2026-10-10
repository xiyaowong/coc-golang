import type { ExtensionContext } from 'coc.nvim'
import * as coc from 'coc.nvim'
import { registerBuildCommands } from './build'
import { registerConvertCommands } from './convert'
import { registerEditCommands } from './edit'
import { registerEnvironmentCommands } from './environment'
import { registerModuleCommands } from './mod'
import { registerTagCommands } from './tags'
import { registerTestCommands } from './test'
import { registerTestExplorerCommands } from './test-explorer'

export function registerCommands(context: ExtensionContext): void {
  registerTestCommands(context)
  registerTestExplorerCommands(context)
  registerBuildCommands(context)
  registerEditCommands(context)
  registerTagCommands(context)
  registerConvertCommands(context)
  registerEnvironmentCommands(context)
  registerModuleCommands(context)
}

export function registerCommand(
  context: ExtensionContext,
  id: string,
  callback: (...args: any[]) => unknown,
): void {
  context.subscriptions.push(coc.commands.registerCommand(id, callback))
}
