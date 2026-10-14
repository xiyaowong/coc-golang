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

export async function activeState(): Promise<{ document: coc.Document, file: string, position: coc.Position } | undefined> {
  const { position } = await coc.workspace.getCurrentState()
  const document = await coc.workspace.document
  if (!document) return undefined
  try {
    return { document, file: fileURLToPath(document.uri), position }
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
  if (!document) return []
  return [...document.textDocument.lines]
}

export async function linesToCursor(): Promise<string[]> {
  const { document, position } = await coc.workspace.getCurrentState()
  return document.lines.slice(0, position.line + 1)
}

export async function wordAtCursor(): Promise<string> {
  const { position } = await coc.workspace.getCurrentState()
  const document = await coc.workspace.document
  if (!document) return ''
  const range = document.getWordRangeAtPosition(position)
  return range ? document.textDocument.getText(range) : ''
}

export function isGoFile(file: string): boolean {
  return file.endsWith(goFileSuffix)
}

export async function activeGoFile(): Promise<string | undefined> {
  const file = await activeFile()
  if (!file || !isGoFile(file)) {
    coc.window.showWarningMessage('Open a Go file first.')
    return undefined
  }
  return file
}

export function counterpartGoFile(file: string): string | undefined {
  if (!isGoFile(file)) return undefined
  if (file.endsWith(testFileSuffix)) {
    return `${file.slice(0, -testFileSuffix.length)}${goFileSuffix}`
  }
  return `${file.slice(0, -goFileSuffix.length)}${testFileSuffix}`
}

export function fileUri(file: string): string {
  return pathToFileURL(file).href
}

export async function scratchBuffer(name: string, filetype: string): Promise<number> {
  const bufnr = await coc.workspace.nvim.call('bufadd', [name]) as number
  await coc.workspace.nvim.call('setbufvar', [bufnr, '&buftype', 'nofile'])
  await coc.workspace.nvim.call('setbufvar', [bufnr, '&bufhidden', 'hide'])
  await coc.workspace.nvim.call('setbufvar', [bufnr, '&swapfile', 0])
  await coc.workspace.nvim.call('setbufvar', [bufnr, '&filetype', filetype])
  await coc.workspace.nvim.call('setbufvar', [bufnr, 'coc_enabled', 0])
  return bufnr
}

export async function setBufferLines(bufnr: number, lines: string[], readonly = false): Promise<void> {
  lines = lines.flatMap(line => line.split(/\r?\n/)).flat()
  const buffer = coc.workspace.nvim.createBuffer(bufnr)
  await buffer.setOption('modifiable', true)
  await buffer.setLines(lines.length ? lines : [''], { start: 0, end: -1, strictIndexing: false })
  await buffer.setOption('modifiable', !readonly)
}

export async function showScratchBuffer(bufnr: number): Promise<void> {
  const windows = await coc.workspace.nvim.call('win_findbuf', [bufnr]) as number[]
  if (windows.length) {
    await coc.workspace.nvim.call('win_gotoid', [windows[0]])
    return
  }
  await coc.workspace.nvim.command('vsplit')
  await coc.workspace.nvim.command(`buffer ${bufnr}`)
}
