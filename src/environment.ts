import { existsSync } from 'node:fs'
import { delimiter, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as coc from 'coc.nvim'
import { configValue } from './config'
import { inferGopath, prependPath } from './go-config-utils'

export interface GoEnvironmentOptions {
  forToolInstall?: boolean
}

const terminalEnvironmentBackup = new Map<string, string | undefined>()

export function goEnvironment(options: GoEnvironmentOptions = {}): NodeJS.ProcessEnv {
  const { forToolInstall = false } = options
  const environment: NodeJS.ProcessEnv = {
    ...process.env,
    ...configValue<Record<string, string>>('toolsEnvVars', {}),
  }
  const goroot = configValue('goroot', '')
  let gopath = configValue('gopath', '')
  if (configValue('inferGopath', false)) {
    const [first] = coc.workspace.workspaceFolders
    const folder = first && fileURLToPath(first.uri)
    if (folder && !existsSync(join(folder, 'go.mod'))) gopath = inferGopath(folder) ?? gopath
  }
  if (goroot) {
    environment.GOROOT = goroot
    prependPath(environment, join(goroot, 'bin'), delimiter)
  }
  if (gopath) environment.GOPATH = gopath
  const toolsGopath = configValue('toolsGopath', '')
  if (forToolInstall && toolsGopath) environment.GOPATH = toolsGopath
  return environment
}

// Mirrors the "go.terminal.activateEnvironment" setting by exporting the Go environment to Neovim.
export async function activateTerminalEnvironment(): Promise<void> {
  for (const [name, value] of terminalEnvironmentBackup) {
    await coc.workspace.nvim.call('setenv', [name, value ?? null])
  }
  terminalEnvironmentBackup.clear()
  if (!configValue('terminal.activateEnvironment', true)) return

  const environment = goEnvironment()
  for (const name of Object.keys(environment)) {
    const value = environment[name]
    const original = process.env[name]
    if (value === undefined || value === original) continue
    terminalEnvironmentBackup.set(name, original)
    await coc.workspace.nvim.call('setenv', [name, value])
  }
}
