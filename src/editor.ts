import { dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import * as coc from 'coc.nvim'

const goFileSuffix = '.go'
const testFileSuffix = '_test.go'

export async function activeFile(): Promise<string | undefined> {
  const { document } = await coc.workspace.getCurrentState()
  try {
    return fileURLToPath(document.uri)
  } catch {
    return undefined
  }
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
  const document = await coc.workspace.document
  return [...document.textDocument.lines]
}

export async function linesToCursor(): Promise<string[]> {
  const { document, position } = await coc.workspace.getCurrentState()
  return document.lines.slice(0, position.line + 1)
}

export async function wordAtCursor(): Promise<string> {
  const { position } = await coc.workspace.getCurrentState()
  const document = await coc.workspace.document
  const range = document.getWordRangeAtPosition(position)
  return range ? document.textDocument.getText(range) : ''
}

export function counterpartGoFile(file: string): string | undefined {
  if (!file.endsWith(goFileSuffix)) return undefined
  if (file.endsWith(testFileSuffix)) {
    return `${file.slice(0, -testFileSuffix.length)}${goFileSuffix}`
  }
  return `${file.slice(0, -goFileSuffix.length)}${testFileSuffix}`
}

export function fileUri(file: string): string {
  return pathToFileURL(file).href
}
