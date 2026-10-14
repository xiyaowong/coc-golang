import type { Terminal } from 'coc.nvim'
import type { Ctx } from '../ctx'
import { window, workspace } from 'coc.nvim'
import { DisposableStore } from '../disposable'

type ShellKind = 'posix' | 'powershell' | 'cmd'

function shellKind(shell: string): ShellKind {
  const name = shell.trim().replace(/^.*[\\/]/, '').toLowerCase().replace(/\.exe$/, '')
  if (name === 'pwsh' || name === 'powershell') return 'powershell'
  if (name === 'cmd') return 'cmd'
  return 'posix'
}

function quoteShellArg(arg: string, kind: ShellKind): string {
  if (kind === 'cmd') {
    return /^[\w@%+=:,./\\-]+$/.test(arg) ? arg : `"${arg.replace(/"/g, '""')}"`
  }
  if (kind === 'powershell') return `'${arg.replace(/'/g, `''`)}'`
  return /^[\w@%+=:,./-]+$/.test(arg) ? arg : `'${arg.replace(/'/g, `'\\''`)}'`
}

function shellCommandLine(command: string, args: string[], kind: ShellKind): string {
  const line = [command, ...args].map(arg => quoteShellArg(arg, kind)).join(' ')
  return kind === 'powershell' ? `& ${line}` : line
}

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
    await this.runLines([[subcommand, ...args]], options)
  }

  // Sends several go invocations to the terminal at once, each on its own line,
  // so a group of them runs in one shell instead of one shell per command.
  async runLines(commands: string[][], options: TerminalRunOptions): Promise<void> {
    const { cwd, environment = {}, focus = false } = options
    this.disposeTerminal()
    try {
      const shell = await workspace.nvim.eval('&shell')
      const kind = shellKind(String(shell))
      const env: Record<string, string> = {}
      for (const [key, value] of Object.entries({ ...this.ctx.environment.variables(), ...environment })) {
        if (value !== undefined) env[key] = value
      }
      const created = await window.createTerminal({ name: 'Go', cwd, env })
      this.terminal = created
      const go = this.ctx.config.goCommand()
      created.sendText(commands.map(args => shellCommandLine(go, args, kind)).join('\n'))
      await created.show(!focus)
    } catch (error) {
      window.showErrorMessage(`Failed to run go: ${String(error)}`)
    }
  }

  override dispose(): void {
    this.disposeTerminal()
    super.dispose()
  }
}
