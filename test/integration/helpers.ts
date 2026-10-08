import type { Diagnostic } from 'coc.nvim'
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { commands, diagnosticManager, workspace } from 'coc.nvim'

export type Files = Record<string, string>

export interface Project {
  root: string
  path: (file: string) => string
  open: (file: string, line?: number) => Promise<void>
  cleanup: () => void
}

export function createProject(files: Files): Project {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'coc-golang-')))
  const all: Files = { 'go.mod': 'module example.com/fixture\n\ngo 1.21\n', ...files }
  for (const [name, content] of Object.entries(all)) {
    const file = join(root, name)
    mkdirSync(dirname(file), { recursive: true })
    writeFileSync(file, content)
  }
  return {
    root,
    path: file => join(root, file),
    async open(file, line = 1) {
      await workspace.nvim.call('execute', [`edit ${join(root, file).replace(/ /g, '\\ ')}`])
      await workspace.nvim.call('cursor', [line, 1])
    },
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  }
}

export async function run(command: string, ...args: unknown[]): Promise<void> {
  await commands.executeCommand(command, ...args)
}

// Returns everything written to the "Go" output channel, which holds the output of every Go process.
export async function goOutput(): Promise<string> {
  const buffer = await workspace.nvim.call('bufnr', ['output:///Go']) as number
  if (buffer < 0) return ''
  const lines = await workspace.nvim.call('getbufline', [buffer, 1, '$']) as string[]
  return lines.join('\n')
}

// The output buffer is updated asynchronously, so poll instead of reading it once.
export async function waitFor<T>(read: () => Promise<T>, accept: (value: T) => boolean, timeout = 15_000): Promise<T> {
  const deadline = Date.now() + timeout
  let value = await read()
  while (!accept(value) && Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, 50))
    value = await read()
  }
  return value
}

export async function outputMatching(pattern: RegExp): Promise<string> {
  return waitFor(goOutput, output => pattern.test(output))
}

// The Go terminal is replaced by every terminal command, so the newest terminal buffer is the current one.
export async function terminalBuffer(): Promise<number> {
  const infos = await workspace.nvim.call('getbufinfo', []) as Array<{ bufnr: number }>
  let found = -1
  for (const { bufnr } of infos) {
    if (await workspace.nvim.call('getbufvar', [bufnr, '&buftype']) === 'terminal') found = Math.max(found, bufnr)
  }
  return found
}

export async function terminalOutput(): Promise<string> {
  const buffer = await terminalBuffer()
  if (buffer < 0) return ''
  const lines = await workspace.nvim.call('getbufline', [buffer, 1, '$']) as string[]
  return lines.join('\n')
}

// The terminal is updated asynchronously, so poll instead of reading it once.
export async function terminalMatching(pattern: RegExp): Promise<string> {
  return waitFor(terminalOutput, output => pattern.test(output))
}

// Waits until a terminal other than `previous` shows the pattern.
export async function rerunTerminalMatching(previous: number, pattern: RegExp): Promise<string> {
  const read = async (): Promise<string> => (await terminalBuffer()) === previous ? '' : terminalOutput()
  return waitFor(read, output => pattern.test(output))
}

// Diagnostics of the current buffer.
export async function currentDiagnostics(collection: string): Promise<Diagnostic[]> {
  const read = async (): Promise<Diagnostic[]> => {
    const { document } = await workspace.getCurrentState()
    return diagnosticManager.getDiagnostics(document.uri)[collection] ?? []
  }
  return waitFor(read, found => found.length > 0, 20_000)
}

export async function currentDiagnosticsCleared(collection: string): Promise<Diagnostic[]> {
  const read = async (): Promise<Diagnostic[]> => {
    const { document } = await workspace.getCurrentState()
    return diagnosticManager.getDiagnostics(document.uri)[collection] ?? []
  }
  return waitFor(read, found => found.length === 0, 20_000)
}
