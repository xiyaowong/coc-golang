import type { ProcessResult } from './process'
import { delimiter, join } from 'node:path'
import * as coc from 'coc.nvim'
import { alternateTool, configValue, goCommand } from './config'
import { findExecutable, goEnvironment, resolveExecutable, toolsDirectories } from './environment'
import { execFileText, runProcess, showCommandOutput } from './process'

interface ToolDefinition { module: string, binary?: string, optional?: boolean }

export const tools: Record<string, ToolDefinition> = {
  'gopls': { module: 'golang.org/x/tools/gopls@latest' },
  'dlv': { module: 'github.com/go-delve/delve/cmd/dlv@latest' },
  'goimports': { module: 'golang.org/x/tools/cmd/goimports@latest' },
  'staticcheck': { module: 'honnef.co/go/tools/cmd/staticcheck@latest' },
  'govulncheck': { module: 'golang.org/x/vuln/cmd/govulncheck@latest' },
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
}

export async function installTool(name: string): Promise<boolean> {
  const command = configValue('toolsManagement.go', '') || goCommand()
  showCommandOutput(`${command} install ${tools[name].module}`)
  try {
    const result = await runProcess(
      command,
      ['install', tools[name].module],
      coc.workspace.cwd,
      goEnvironment(true),
    )
    if (result.code !== 0) {
      coc.window.showMessage(`Failed to install ${name} (exit code ${result.code}). See Go output.`, 'error')
      return false
    }
    coc.window.showMessage(`${name} installed successfully.`)
    return true
  } catch (error) {
    coc.window.showMessage(`Failed to install ${name}: ${String(error)}`, 'error')
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
      const gopath = (await execFileText(goCommand(), ['env', 'GOPATH'], env)).trim()
      directories.push(...gopath.split(delimiter).filter(Boolean).map(item => join(item, 'bin')))
    } catch {
      // The go command is unavailable; only PATH and explicit settings can be used.
    }
  }
  return findExecutable(directories, configured)
}

export async function runTool(
  name: string,
  args: string[],
  cwd: string,
  options: { input?: string, quiet?: boolean } = {},
): Promise<ProcessResult | undefined> {
  let executable = await toolExecutable(name)
  if (!executable && configValue('autoInstallTools', false) && await coc.window.showPrompt(`${name} is missing. Install it now?`)) {
    if (await installTool(name)) executable = await toolExecutable(name)
  }
  if (!executable) {
    coc.window.showMessage(`The ${name} tool is not installed. Run :CocCommand go.tools.install.${name}.`, 'warning')
    return undefined
  }
  if (!options.quiet) showCommandOutput(`${executable} ${args.join(' ')}`)
  try {
    const result = await runProcess(executable, args, cwd, goEnvironment(), undefined, options.input)
    if (options.quiet) return result
    if (name === 'govulncheck' && result.code === 3) {
      coc.window.showMessage('govulncheck found vulnerabilities. See Go output.', 'warning')
    } else if (result.code !== 0) {
      coc.window.showMessage(`${name} exited with code ${result.code}`, 'error')
    }
    return result
  } catch (error) {
    coc.window.showMessage(`Failed to run ${name}: ${String(error)}`, 'error')
  }
}
