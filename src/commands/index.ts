import type { ExtensionContext } from 'coc.nvim'
import { registerBuildCommands } from './build'
import { registerEditCommands } from './edit'
import { registerEnvironmentCommands } from './environment'
import { registerTagCommands } from './tags'
import { registerBenchmarkCommands, registerTestCommands } from './test'

export function registerCommands(context: ExtensionContext): void {
  registerTestCommands(context)
  registerBenchmarkCommands(context)
  registerBuildCommands(context)
  registerEditCommands(context)
  registerTagCommands(context)
  registerEnvironmentCommands(context)
}
