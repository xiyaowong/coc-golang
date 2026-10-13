import type { Terminal } from 'coc.nvim'
import type { Ctx } from '../ctx'
import { window, workspace } from 'coc.nvim'
import { DisposableStore } from '../disposable'
import { shellCommandLine, shellKind } from './shell-utils'

export interface TerminalRunOptions {
  cwd: string
  environment?: NodeJS.ProcessEnv
  focus?: boolean
}

export class TerminalManager extends DisposableStore {
  private terminal: Terminal | undefined

  constructor(private readonly ctx: Ctx) {
    super()
  }

  current(): Terminal | undefined {
    return this.terminal
  }

  disposeTerminal(): void {
    this.terminal?.dispose()
    this.terminal = undefined
  }

  async runGo(
    subcommand: string,
    args: string[],
    options: TerminalRunOptions,
  ): Promise<void> {
    const { cwd, environment = {}, focus = false } = options
    this.disposeTerminal()
    try {
      const shell = await workspace.nvim.eval('&shell')
      const line = shellCommandLine(this.ctx.config.goCommand(), [subcommand, ...args], shellKind(String(shell)))
      const env: Record<string, string> = {}
      for (const [key, value] of Object.entries({ ...this.ctx.environment.variables(), ...environment })) {
        if (value !== undefined) env[key] = value
      }
      const created = await window.createTerminal({ name: 'Go', cwd, env })
      this.terminal = created
      created.sendText(line)
      await created.show(!focus)
    } catch (error) {
      window.showErrorMessage(`Failed to run go ${subcommand}: ${String(error)}`)
    }
  }

  override dispose(): void {
    this.disposeTerminal()
    super.dispose()
  }
}
