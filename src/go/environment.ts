import type { Ctx } from '../ctx'
import { existsSync } from 'node:fs'
import { delimiter, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { workspace } from 'coc.nvim'
import { DisposableStore } from '../disposable'
import { inferGopath, prependPath } from './config-utils'

export interface GoEnvironmentOptions {
  forToolInstall?: boolean
}

export class GoEnvironment extends DisposableStore {
  private readonly terminalBackup = new Map<string, string | undefined>()

  constructor(private readonly ctx: Ctx) {
    super()
    this.track(this.ctx.config.onDidChange((change) => {
      if (change.environment) void this.activateTerminal()
    }))
  }

  variables(options: GoEnvironmentOptions = {}): NodeJS.ProcessEnv {
    const { forToolInstall = false } = options
    const config = this.ctx.config
    const environment: NodeJS.ProcessEnv = {
      ...process.env,
      ...config.get<Record<string, string>>('toolsEnvVars', {}),
    }
    const goroot = config.get('goroot', '')
    let gopath = config.get('gopath', '')
    if (config.get('inferGopath', false)) {
      const [first] = workspace.workspaceFolders
      const folder = first && fileURLToPath(first.uri)
      if (folder && !existsSync(join(folder, 'go.mod'))) gopath = inferGopath(folder) ?? gopath
    }
    if (goroot) {
      environment.GOROOT = goroot
      prependPath(environment, join(goroot, 'bin'), delimiter)
    }
    if (gopath) environment.GOPATH = gopath
    const toolsGopath = config.get('toolsGopath', '')
    if (forToolInstall && toolsGopath) environment.GOPATH = toolsGopath
    return environment
  }

  // Mirrors the "go.terminal.activateEnvironment" setting by exporting the Go environment to Neovim.
  async activateTerminal(): Promise<void> {
    for (const [name, value] of this.terminalBackup) {
      await workspace.nvim.call('setenv', [name, value ?? null])
    }
    this.terminalBackup.clear()
    if (!this.ctx.config.get('terminal.activateEnvironment', true)) return

    const environment = this.variables()
    for (const name of Object.keys(environment)) {
      const value = environment[name]
      const original = process.env[name]
      if (value === undefined || value === original) continue
      this.terminalBackup.set(name, original)
      await workspace.nvim.call('setenv', [name, value])
    }
  }
}
