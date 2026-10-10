import * as coc from 'coc.nvim'
import { goCommand } from './config'
import { goEnvironment } from './environment'
import { shellCommandLine, shellKind } from './shell-utils'

export interface TerminalRunOptions {
  cwd: string
  environment?: NodeJS.ProcessEnv
  focus?: boolean
}

let goTerminal: coc.Terminal | undefined

export function terminal(): coc.Terminal | undefined {
  return goTerminal
}

export function disposeTerminal(): void {
  goTerminal?.dispose()
  goTerminal = undefined
}

export async function runGoInTerminal(
  subcommand: string,
  args: string[],
  options: TerminalRunOptions,
): Promise<void> {
  const { cwd, environment = {}, focus = false } = options
  disposeTerminal()
  try {
    const shell = await coc.workspace.nvim.eval('&shell')
    const line = shellCommandLine(goCommand(), [subcommand, ...args], shellKind(String(shell)))
    const env: Record<string, string> = {}
    for (const [key, value] of Object.entries({ ...goEnvironment(), ...environment })) {
      if (value !== undefined) env[key] = value
    }
    const created = await coc.window.createTerminal({ name: 'Go', cwd, env })
    goTerminal = created
    created.sendText(line)
    await created.show(!focus)
  } catch (error) {
    coc.window.showErrorMessage(`Failed to run go ${subcommand}: ${String(error)}`)
  }
}
