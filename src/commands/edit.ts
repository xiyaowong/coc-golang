import type { Document } from 'coc.nvim'
import type { Ctx } from '../ctx'
import { dirname } from 'node:path'
import { Position, TextEdit, window } from 'coc.nvim'
import { activeDirectory, activeFile, activeGoFile, activeState, fileUri, isGoFile, linesToCursor } from '../editor'
import { toolFailure } from '../go/tools'
import { functionNameAtCursor, testArgumentsAtCursor } from '../test/utils'

function unquote(value: string): string {
  const quoted = /^(['"])(.*)\1$/.exec(value)
  return quoted ? quoted[2].trim() : value
}

// `impl` takes the receiver and the interface as two arguments, and the receiver
// may be several words ("f *File"), so the input is cut at the last whitespace
// that is outside a type-parameter list rather than at every one.
export function splitImplInput(input: string): [string, string] | undefined {
  input = input.trim()
  let depth = 0
  let split = -1
  for (let index = 0; index < input.length; index++) {
    const character = input[index]
    if (character === '[') depth++
    else if (character === ']') depth = Math.max(0, depth - 1)
    else if (depth === 0 && /\s/.test(character)) split = index
  }
  if (split === -1) return undefined
  const receiver = unquote(input.slice(0, split).trim())
  const iface = unquote(input.slice(split + 1).trim())
  return receiver && iface ? [receiver, iface] : undefined
}

// Maps every offset in Go source to the offset just past the top-level
// declaration that offset belongs to, ignoring braces in comments and strings.
export function declarationEnds(text: string): number[] {
  const ends: number[] = []
  for (let position = 0; position <= text.length; position++) {
    ends.push(text.length)
  }
  let depth = 0
  let start = 0
  let end = -1
  let index = 0
  const fill = (upTo: number): void => {
    const value = end === -1 ? text.length : end
    for (let position = start; position <= upTo && position < ends.length; position++) {
      ends[position] = value
    }
  }

  while (index < text.length) {
    const character = text[index]
    if (character === '/' && text[index + 1] === '/') {
      const newline = text.indexOf('\n', index)
      index = newline === -1 ? text.length : newline
      continue
    }
    if (character === '/' && text[index + 1] === '*') {
      const comment = text.indexOf('*/', index + 2)
      index = comment === -1 ? text.length : comment + 2
      continue
    }
    if (character === '"' || character === '\'' || character === '`') {
      index++
      while (index < text.length) {
        if (text[index] === '\\' && character !== '`') {
          index += 2
        } else if (text[index] === character) {
          index++
          break
        } else {
          index++
        }
      }
      continue
    }
    if (character === '{') {
      depth++
    } else if (character === '}') {
      depth = Math.max(0, depth - 1)
      if (depth === 0) {
        end = index + 1
        fill(index)
        start = index + 1
        end = -1
      }
    }
    index++
  }
  fill(text.length)
  return ends
}

// The stubs are placed after the top-level declaration the cursor is in, so
// they never land on the text the cursor is on or inside a declaration.
export function implInsertPosition(document: Document, cursor: Position): Position {
  const text = document.content
  const offset = Math.min(Math.max(0, document.textDocument.offsetAt(cursor)), text.length)
  const line = document.textDocument.positionAt(declarationEnds(text)[offset]).line
  return Position.create(line, document.getline(line).length)
}

export function registerEditCommands(ctx: Ctx): void {
  const gotestsArguments = (...args: string[]): string[] =>
    [...ctx.config.get<string[]>('generateTestsFlags', []), ...args]

  const addImport = async (importPath?: string): Promise<void> => {
    const file = await activeGoFile()
    if (!file) return
    const client = ctx.languageServer.getClient()
    if (!client) {
      window.showWarningMessage('gopls is not running.')
      return
    }
    const uri = fileUri(file)
    let selected = importPath?.trim() ?? ''
    if (!selected) {
      let packages: string[] = []
      try {
        const result = await client.sendRequest<{ Packages?: string[] }>('workspace/executeCommand', {
          command: 'gopls.list_known_packages',
          arguments: [{ URI: uri }],
        })
        packages = result?.Packages?.filter(Boolean) ?? []
      } catch {
        packages = []
      }
      if (packages.length) {
        const picked = await window.showQuickPick(packages, { title: 'Select a package to import', placeHolder: 'Type to filter' })
        if (!picked) return
        selected = picked
      } else {
        selected = (await window.requestInput('Import path'))?.trim() ?? ''
      }
    }
    if (!selected) return
    try {
      await client.sendRequest('workspace/executeCommand', {
        command: 'gopls.add_import',
        arguments: [{ ImportPath: selected, URI: uri }],
      })
    } catch (error) {
      window.showErrorMessage(`Failed to add import: ${String(error)}`)
    }
  }

  const generateTestForFunction = async (): Promise<void> => {
    const lines = await linesToCursor()
    const args = testArgumentsAtCursor(lines)
    if (!args || args.includes('-bench')) {
      window.showWarningMessage('Place the cursor inside a Go test or example function.')
      return
    }
    const functionName = functionNameAtCursor(lines)
    if (!functionName) return
    const file = await activeFile()
    if (file) await ctx.tools.run('gotests', gotestsArguments('-w', '-only', `^${functionName}$`, file), { cwd: dirname(file) })
  }

  ctx.commands.handle('go.import.add', (importPath?: string) => addImport(importPath))

  ctx.commands.handle('go.test.generate.file', async () => {
    const file = await activeGoFile()
    if (!file) return
    await ctx.tools.run('gotests', gotestsArguments('-w', '-all', file), { cwd: dirname(file) })
  })
  ctx.commands.handle('go.test.generate.package', async () =>
    ctx.tools.run('gotests', gotestsArguments('-w', '-all', '.'), { cwd: await activeDirectory() }))
  ctx.commands.handle('go.test.generate.function', () => generateTestForFunction())

  ctx.commands.handle('go.impl.cursor', async (implementation?: string) => {
    const active = await activeState()
    if (!active || !isGoFile(active.file)) {
      window.showWarningMessage('Open a Go file first.')
      return
    }
    implementation ??= await window.requestInput('Receiver and interface (e.g. f *File io.Reader)')
    if (!implementation) return

    const args = splitImplInput(implementation)
    if (!args) {
      window.showWarningMessage('Enter a receiver and an interface, e.g. f *File io.Reader')
      return
    }

    const directory = dirname(active.file)
    const result = await ctx.tools.run('impl', ['-dir', directory, ...args], { cwd: directory, quiet: true })
    if (!result) return
    if (result.code !== 0) {
      window.showErrorMessage(toolFailure('impl failed', result))
      return
    }
    const stubs = result.stdout.trim()
    if (!stubs) {
      window.showWarningMessage('impl generated no stubs.')
      return
    }
    let position: Position
    try {
      position = implInsertPosition(active.document, active.position)
    } catch {
      // A buffer too large for the position helpers falls back to the file end.
      const lastLine = active.document.lineCount - 1
      position = Position.create(Math.max(0, lastLine), Number.MAX_SAFE_INTEGER)
    }
    await active.document.applyEdits([TextEdit.insert(position, `\n\n${stubs}\n`)])
    await active.document.synchronize()
  })
}
