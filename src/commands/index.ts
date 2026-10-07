import type { ExtensionContext } from 'coc.nvim'
import { registerBuildCommands } from './build'
import { registerEditCommands } from './edit'
import { registerEnvironmentCommands } from './environment'
import { registerBenchmarkCommands, registerTestCommands } from './test'

export function registerCommands(context: ExtensionContext): void {
  registerTestCommands(context)
  registerBenchmarkCommands(context)
  registerBuildCommands(context)
  registerEditCommands(context)
  registerEnvironmentCommands(context)
}
