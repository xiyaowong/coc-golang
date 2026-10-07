import { accessSync, constants, existsSync } from 'node:fs'
import { homedir, platform } from 'node:os'
import { delimiter, isAbsolute, join } from 'node:path'
import * as coc from 'coc.nvim'
import { configValue } from './config'
import { workspaceDirectories } from './editor'
import { inferGopath, pathKey, prependPath } from './go-config-utils'

export interface GoEnvironmentOptions {
  forToolInstall?: boolean
}

const terminalEnvironmentBackup = new Map<string, string | undefined>()

export function toolsDirectories(environment: NodeJS.ProcessEnv): string[] {
  const directories: (string | undefined)[] = [
    environment.GOBIN,
    ...(environment.GOPATH || '').split(delimiter).filter(Boolean).map(item => join(item, 'bin')),
  ]
  const toolsGopath = configValue('toolsGopath', '')
  if (toolsGopath) directories.unshift(join(toolsGopath, 'bin'))
  return directories.filter((directory): directory is string => !!directory)
}

export function goEnvironment(options: GoEnvironmentOptions = {}): NodeJS.ProcessEnv {
  const { forToolInstall = false } = options
  const environment: NodeJS.ProcessEnv = {
    ...process.env,
    ...configValue<Record<string, string>>('toolsEnvVars', {}),
  }
  const goroot = configValue('goroot', '')
  let gopath = configValue('gopath', '')
  if (configValue('inferGopath', false)) {
    const folder = workspaceDirectories()[0]
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

function executableExtensions(): string[] {
  return platform() === 'win32'
    ? (process.env.PATHEXT || '.EXE;.CMD;.BAT').split(';')
    : ['']
}

export function findExecutable(directories: string[], name: string): string | undefined {
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

export function resolveExecutable(command: string, env: NodeJS.ProcessEnv = process.env): string | undefined {
  const expanded = command.startsWith('~') ? join(homedir(), command.slice(1)) : command
  if (isAbsolute(expanded) || expanded.includes('/') || expanded.includes('\\')) {
    const file = isAbsolute(expanded) ? expanded : join(coc.workspace.cwd, expanded)
    try {
      accessSync(file, constants.X_OK)
      return existsSync(file) ? file : undefined
    } catch {
      return undefined
    }
  }
  return findExecutable((env[pathKey(env)] || '').split(delimiter), expanded)
}
