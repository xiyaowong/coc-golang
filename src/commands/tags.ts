import type { Position } from 'coc.nvim'
import type { Ctx } from '../ctx'
import { Buffer } from 'node:buffer'
import { rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import * as coc from 'coc.nvim'
import { window, workspace } from 'coc.nvim'
import { activeGoFile } from '../editor'

interface ParsedTagInput {
  tags: string[]
  options: string[]
}

// Parses user input containing tags and options into separate lists.
// E.g. "json,json=omitempty,xml=attr" ->
//   tags: ["json"]
//   options: ["json=omitempty", "xml=attr"]
//
// Can also handle items with static values like "validate:gt=1,scope:read-only" ->
//   tags: ["validate:gt=1", "scope:read-only"]
function parseTagAndOptionInput(input: string | string[]): ParsedTagInput {
  const items = Array.isArray(input)
    ? input.flatMap(item => item.split(',').map(s => s.trim()).filter(Boolean))
    : input.split(',').map(s => s.trim()).filter(Boolean)

  const tags: string[] = []
  const options: string[] = []

  for (const item of items) {
    const colonIndex = item.indexOf(':')
    const equalIndex = item.indexOf('=')

    // If '=' exists and is not part of a static tag value (which starts with key:value)
    if (equalIndex !== -1 && (colonIndex === -1 || equalIndex < colonIndex)) {
      options.push(item)
    } else {
      tags.push(item)
    }
  }

  return { tags, options }
}

interface ModifyTagsOutput {
  start: number
  end: number
  lines: string[]
}

// gomodifytags locates the struct by line, offset or name; this picks whichever
// the cursor position and current mode describe.
async function targetArguments(doc: coc.Document): Promise<string[]> {
  const nvim = workspace.nvim
  const args: string[] = []
  const mode = await nvim.call('mode') as string
  const isVisual = mode.startsWith('v') || mode.startsWith('V') || mode === '\x16'

  if (isVisual) {
    const visualMode = await nvim.call('visualmode') as string
    const range = visualMode ? await window.getSelectedRange(visualMode) : null
    if (range) {
      const startLine = range.start.line + 1
      const endLine = range.end.line + 1
      args.push('-line', startLine === endLine ? `${startLine}` : `${startLine},${endLine}`)
    }
  }

  if (args.includes('-line')) return args

  const { position } = await workspace.getCurrentState()
  const lineText = doc.getline(position.line)
  const trimmedLine = lineText.trimStart()
  const byteOffsetAt = (offset: Position): number =>
    Buffer.byteLength(doc.content.slice(0, doc.textDocument.offsetAt(offset)), 'utf8')

  const structName = /^type\s+(\w+)(?:\[.*\])?\s*struct\s*\{/.exec(trimmedLine)?.[1]
  if (structName) {
    args.push('-struct', structName)
  } else if (trimmedLine === '}') {
    args.push('-offset', `${byteOffsetAt(coc.Position.create(position.line, 0)) - 1}`)
  } else if (lineText.slice(0, position.character).trim() === '') {
    args.push('-offset', `${byteOffsetAt(coc.Position.create(position.line, position.character))}`)
  } else {
    args.push('-line', `${position.line + 1}`)
  }
  return args
}

async function modify(ctx: Ctx, operation: 'add' | 'remove' | 'clear', tagInput?: string[] | string): Promise<void> {
  const filePath = await activeGoFile()
  if (!filePath) return

  const doc = await workspace.document
  if (!doc) return

  let tempFile: string | undefined
  let targetFile = filePath

  const isDirty = await doc.buffer.getOption('modified') as boolean
  if (isDirty) {
    tempFile = join(tmpdir(), `coc-golang-gomodifytags-${Date.now()}-${Math.random().toString(36).slice(2)}.go`)
    writeFileSync(tempFile, doc.content)
    targetFile = tempFile
  }

  try {
    const args = ['-file', targetFile, '-format', 'json', ...await targetArguments(doc)]

    if (operation === 'clear') {
      args.push('-clear-tags', '-clear-options')
    } else {
      if (tagInput === undefined) {
        tagInput = await window.requestInput(
          `${operation === 'add' ? 'Tags/options to add' : 'Tags/options to remove'} (comma-separated, e.g. json,json=omitempty)`,
        )
      }
      if (!tagInput) return

      const { tags, options } = parseTagAndOptionInput(tagInput)
      if (tags.length === 0 && options.length === 0) return

      if (operation === 'add') {
        if (tags.length > 0) args.push('-add-tags', tags.join(','))
        if (options.length > 0) args.push('-add-options', options.join(','))
      } else {
        if (tags.length > 0) args.push('-remove-tags', tags.join(','))
        if (options.length > 0) args.push('-remove-options', options.join(','))
      }
    }

    const result = await ctx.tools.run('gomodifytags', args, { cwd: dirname(filePath), quiet: true })
    if (!result || result.code !== 0) {
      window.showErrorMessage(`gomodifytags failed (code ${result?.code}): ${result?.output?.trim() || 'no output'}`)
      return
    }

    let parsed: ModifyTagsOutput
    try {
      parsed = JSON.parse(result.stdout) as ModifyTagsOutput
    } catch {
      window.showErrorMessage(`Failed to parse gomodifytags output: ${result.stdout}`)
      return
    }

    // gomodifytags start and end are 1-based line numbers (inclusive)
    const startLineIndex = parsed.start - 1
    const endLineIndex = parsed.end

    const editRange = coc.Range.create(
      coc.Position.create(startLineIndex, 0),
      coc.Position.create(endLineIndex, 0),
    )

    const parsedLines = parsed.lines.map(line => line.trimEnd())
    const newText = parsed.lines.length > 0 ? `${parsedLines.join('\n')}\n` : ''

    await doc.applyEdits([coc.TextEdit.replace(editRange, newText)])
  } finally {
    if (tempFile) {
      try {
        rmSync(tempFile, { force: true })
      } catch {
        // ignore cleanup error
      }
    }
  }
}

export function registerTagCommands(ctx: Ctx): void {
  ctx.commands.handle('go.tags.add', async (tags?: string[] | string) => modify(ctx, 'add', tags))
  ctx.commands.handle('go.tags.remove', async (tags?: string[] | string) => modify(ctx, 'remove', tags))
  ctx.commands.handle('go.tags.clear', async () => modify(ctx, 'clear'))
}
