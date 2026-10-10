import { accessSync, constants, existsSync } from 'node:fs'
import { homedir, platform } from 'node:os'
import { delimiter, isAbsolute, join } from 'node:path'
import * as coc from 'coc.nvim'
import { configValue } from './config'
import { pathKey } from './go-config-utils'

// Directories that may hold Go tool binaries: GOBIN, each GOPATH's bin, and the
// configured go.toolsGopath.
export function toolsDirectories(environment: NodeJS.ProcessEnv): string[] {
  const directories: (string | undefined)[] = [
    environment.GOBIN,
    ...(environment.GOPATH || '').split(delimiter).filter(Boolean).map(item => join(item, 'bin')),
  ]
  const toolsGopath = configValue('toolsGopath', '')
  if (toolsGopath) directories.unshift(join(toolsGopath, 'bin'))
  return directories.filter((directory): directory is string => !!directory)
}

function executableExtensions(): string[] {
  return platform() === 'win32'
    ? (process.env.PATHEXT || '.EXE;.CMD;.BAT').split(';')
    : ['']
}

// Returns the first executable named `name` found in `directories`.
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

// Resolves a configured tool name or path to an absolute executable path. A bare
// name is looked up on PATH; a path (absolute, relative or with a separator) is
// resolved against the workspace.
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
