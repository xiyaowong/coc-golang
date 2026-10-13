import type { Ctx } from '../ctx'
import type { ProcessResult } from './process'
import { accessSync, constants, existsSync } from 'node:fs'
import { homedir, platform } from 'node:os'
import { delimiter, isAbsolute, join } from 'node:path'
import { window, workspace } from 'coc.nvim'
import { DisposableStore } from '../disposable'

interface ToolDefinition {
  module: string
  binary?: string
  optional?: boolean
}

export interface ToolRunOptions {
  cwd: string
  input?: string
  quiet?: boolean
}

export const tools: Record<string, ToolDefinition> = {
  'gopls': { module: 'golang.org/x/tools/gopls@latest' },
  'dlv': { module: 'github.com/go-delve/delve/cmd/dlv@latest' },
  'goimports': { module: 'golang.org/x/tools/cmd/goimports@latest' },
  'staticcheck': { module: 'honnef.co/go/tools/cmd/staticcheck@latest' },
  'gomodifytags': { module: 'github.com/fatih/gomodifytags@latest' },
  'gotests': { module: 'github.com/cweill/gotests/gotests@latest' },
  'impl': { module: 'github.com/josharian/impl@latest' },
  'golint': { module: 'golang.org/x/lint/golint@latest', optional: true },
  'golangci-lint': {
    module: 'github.com/golangci/golangci-lint/cmd/golangci-lint@latest',
    binary: 'golangci-lint',
    optional: true,
  },
  'golangci-lint-v2': {
    module: 'github.com/golangci/golangci-lint/v2/cmd/golangci-lint@latest',
    binary: 'golangci-lint',
    optional: true,
  },
  'revive': { module: 'github.com/mgechev/revive@latest', optional: true },
  'gofumpt': { module: 'mvdan.cc/gofumpt@latest', optional: true },
  'goformat': { module: 'winterdrache.de/goformat/goformat@latest', optional: true },
  // The module declares github.com/atombender/go-jsonschema, not the omissis repository path.
  'go-jsonschema': { module: 'github.com/atombender/go-jsonschema@latest', optional: true },
}

export function toolFailure(title: string, result: ProcessResult): string {
  const detail = result.output.trim().split(/\r?\n/).filter(Boolean).slice(-3).join('\n')
  return [title, detail].filter(Boolean).join('\n')
}

// Directories that may hold Go tool binaries: GOBIN, each GOPATH's bin, and the
// configured `go.toolsGopath`, which is passed in rather than read from the
// settings so this stays a pure helper.
function toolsDirectories(environment: NodeJS.ProcessEnv, toolsGopath = ''): string[] {
  const directories: (string | undefined)[] = [
    environment.GOBIN,
    ...(environment.GOPATH || '').split(delimiter).filter(Boolean).map(item => join(item, 'bin')),
  ]
  if (toolsGopath) directories.unshift(join(toolsGopath, 'bin'))
  return directories.filter((directory): directory is string => !!directory)
}

function executableExtensions(): string[] {
  return platform() === 'win32'
    ? (process.env.PATHEXT || '.EXE;.CMD;.BAT').split(';')
    : ['']
}

// Returns the first executable named `name` found in `directories`.
function findExecutable(directories: string[], name: string): string | undefined {
  for (const directory of directories) {
    for (const extension of executableExtensions()) {
      const candidate = join(directory, name + extension)
      try {
        accessSync(candidate, constants.X_OK)
        return candidate
      } catch {
        continue
      }
    }
  }
}

// Resolves a configured tool name or path to an absolute executable path. A bare
// name is looked up on PATH; a path (absolute, relative or with a separator) is
// resolved against the workspace.
export function resolveExecutable(command: string, env: NodeJS.ProcessEnv = process.env): string | undefined {
  const expanded = command.startsWith('~') ? join(homedir(), command.slice(1)) : command
  if (isAbsolute(expanded) || expanded.includes('/') || expanded.includes('\\')) {
    const file = isAbsolute(expanded) ? expanded : join(workspace.cwd, expanded)
    try {
      accessSync(file, constants.X_OK)
      return existsSync(file) ? file : undefined
    } catch {
      return undefined
    }
  }
  const pathKey = Object.keys(env).find(key => key.toLowerCase() === 'path') ?? 'PATH'
  return findExecutable((env[pathKey] || '').split(delimiter), expanded)
}

export class ToolManager extends DisposableStore {
  constructor(private readonly ctx: Ctx) {
    super()
  }

  executable(name: string): Promise<string | undefined> {
    return this.resolve(name)
  }

  private async resolve(name: string): Promise<string | undefined> {
    const config = this.ctx.config
    const env = this.ctx.environment.variables()
    const configured = config.alternateTool(name) ?? tools[name]?.binary ?? name
    const found = resolveExecutable(configured, env)
    if (found || configured.includes('/') || configured.includes('\\')) return found

    const toolsGopath = config.get('toolsGopath', '')
    const directories = toolsDirectories(env, toolsGopath)
    if (!env.GOPATH && !toolsGopath) {
      try {
        const gopath = (await this.ctx.process.execFileText(config.goCommand(), ['env', 'GOPATH'], { env })).trim()
        directories.push(...gopath.split(delimiter).filter(Boolean).map(item => join(item, 'bin')))
      } catch {
        // The go command is unavailable; only PATH and explicit settings can be used.
      }
    }
    return findExecutable(directories, configured)
  }

  async install(name: string): Promise<boolean> {
    const command = this.ctx.config.get('toolsManagement.go', '') || this.ctx.config.goCommand()
    const module = tools[name].module
    this.ctx.output.header(`${command} install ${module}`)
    try {
      const result = await this.ctx.process.run(command, ['install', module], {
        cwd: workspace.cwd,
        env: this.ctx.environment.variables({ forToolInstall: true }),
      })
      if (result.code !== 0) {
        await window.showNotification({
          kind: 'error',
          title: `Failed to install ${name}`,
          content: toolFailure(`Exit code ${result.code}`, result),
        })
        return false
      }
      window.showInformationMessage(`${name} installed successfully.`)
      return true
    } catch (error) {
      window.showErrorMessage(`Failed to install ${name}: ${String(error)}`)
      return false
    }
  }

  async run(
    name: string,
    args: string[],
    options: ToolRunOptions,
  ): Promise<ProcessResult | undefined> {
    const { cwd, input, quiet = false } = options
    let executable = await this.resolve(name)
    if (!executable && this.ctx.config.get('autoInstallTools', false)
      && await window.showPrompt(`${name} is missing. Install it now?`)) {
      if (await this.install(name)) executable = await this.resolve(name)
    }
    if (!executable) {
      window.showWarningMessage(`The ${name} tool is not installed. Run :CocCommand go.tools.install.${name}.`)
      return undefined
    }
    if (!quiet) this.ctx.output.header(`${executable} ${args.join(' ')}`)
    try {
      const result = await this.ctx.process.run(executable, args, {
        cwd,
        env: this.ctx.environment.variables(),
        input,
      })
      if (quiet) return result
      if (result.code !== 0) {
        await window.showNotification({
          kind: 'error',
          title: `${name} failed`,
          content: toolFailure(`Exit code ${result.code}`, result),
        })
      }
      return result
    } catch (error) {
      window.showErrorMessage(`Failed to run ${name}: ${String(error)}`)
    }
  }
}
