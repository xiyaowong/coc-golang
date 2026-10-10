import type { ProcessResult } from './process'
import { delimiter, join } from 'node:path'
import * as coc from 'coc.nvim'
import { alternateTool, configValue, goCommand } from './config'
import { goEnvironment } from './environment'
import { findExecutable, resolveExecutable, toolsDirectories } from './executable'
import { showCommandOutput } from './output'
import { execFileText, runProcess } from './process'

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

export async function installTool(name: string): Promise<boolean> {
  const command = configValue('toolsManagement.go', '') || goCommand()
  const module = tools[name].module
  showCommandOutput(`${command} install ${module}`)
  try {
    const result = await runProcess(command, ['install', module], {
      cwd: coc.workspace.cwd,
      env: goEnvironment({ forToolInstall: true }),
    })
    if (result.code !== 0) {
      await coc.window.showNotification({
        kind: 'error',
        title: `Failed to install ${name}`,
        content: toolFailure(`Exit code ${result.code}`, result),
      })
      return false
    }
    coc.window.showInformationMessage(`${name} installed successfully.`)
    return true
  } catch (error) {
    coc.window.showErrorMessage(`Failed to install ${name}: ${String(error)}`)
    return false
  }
}

export async function toolExecutable(name: string): Promise<string | undefined> {
  const env = goEnvironment()
  const configured = alternateTool(name) ?? tools[name]?.binary ?? name
  const found = resolveExecutable(configured, env)
  if (found || configured.includes('/') || configured.includes('\\')) return found

  const directories = toolsDirectories(env)
  if (!env.GOPATH && !configValue('toolsGopath', '')) {
    try {
      const gopath = (await execFileText(goCommand(), ['env', 'GOPATH'], { env })).trim()
      directories.push(...gopath.split(delimiter).filter(Boolean).map(item => join(item, 'bin')))
    } catch {
      // The go command is unavailable; only PATH and explicit settings can be used.
    }
  }
  return findExecutable(directories, configured)
}

export function toolFailure(title: string, result: ProcessResult): string {
  const detail = result.output.trim().split(/\r?\n/).filter(Boolean).slice(-3).join('\n')
  return [title, detail].filter(Boolean).join('\n')
}

export async function runTool(
  name: string,
  args: string[],
  options: ToolRunOptions,
): Promise<ProcessResult | undefined> {
  const { cwd, input, quiet = false } = options
  let executable = await toolExecutable(name)
  if (!executable && configValue('autoInstallTools', false) && await coc.window.showPrompt(`${name} is missing. Install it now?`)) {
    if (await installTool(name)) executable = await toolExecutable(name)
  }
  if (!executable) {
    coc.window.showWarningMessage(`The ${name} tool is not installed. Run :CocCommand go.tools.install.${name}.`)
    return undefined
  }
  if (!quiet) showCommandOutput(`${executable} ${args.join(' ')}`)
  try {
    const result = await runProcess(executable, args, { cwd, env: goEnvironment(), input })
    if (quiet) return result
    if (result.code !== 0) {
      await coc.window.showNotification({
        kind: 'error',
        title: `${name} failed`,
        content: toolFailure(`Exit code ${result.code}`, result),
      })
    }
    return result
  } catch (error) {
    coc.window.showErrorMessage(`Failed to run ${name}: ${String(error)}`)
  }
}
