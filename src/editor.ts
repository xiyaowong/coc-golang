import { dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import * as coc from 'coc.nvim'

export async function activeFile(): Promise<string | undefined> {
  const file = await coc.workspace.nvim.eval('expand("%:p")')
  return typeof file === 'string' && file ? file : undefined
}

export async function activeDirectory(): Promise<string> {
  const file = await activeFile()
  return file ? dirname(file) : coc.workspace.cwd
}

export function workspaceDirectories(): string[] {
  const directories = coc.workspace.workspaceFolders
    .map((folder) => {
      try {
        return fileURLToPath(folder.uri)
      } catch {
        return undefined
      }
    })
    .filter((directory): directory is string => directory !== undefined)
  return directories.length ? directories : [coc.workspace.cwd]
}

export async function currentBufferLines(): Promise<string[]> {
  const lines = await coc.workspace.nvim.eval('getline(1, "$")')
  return Array.isArray(lines) ? lines.map(String) : []
}

export async function linesToCursor(): Promise<string[] | string> {
  return await coc.workspace.nvim.eval('getline(1, line("."))') as string[] | string
}

export async function wordAtCursor(): Promise<string> {
  return await coc.workspace.nvim.eval('expand("<cword>")') as string
}

export function counterpartGoFile(file: string): string | undefined {
  if (!file.endsWith('.go')) return undefined
  return file.endsWith('_test.go')
    ? `${file.slice(0, -'_test.go'.length)}.go`
    : `${file.slice(0, -'.go'.length)}_test.go`
}

export function fileUri(file: string): string {
  return pathToFileURL(file).href
}
