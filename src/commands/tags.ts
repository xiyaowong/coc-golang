import type { ExtensionContext } from 'coc.nvim'
import { Buffer } from 'node:buffer'
import { rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import * as coc from 'coc.nvim'
import { activeGoFile } from '../editor'
import { parseTagAndOptionInput } from '../tag-utils'
import { runTool } from '../tools'
import { registerCommand } from './register'

interface ModifyTagsOutput {
  start: number
  end: number
  lines: string[]
}

async function runModifyTags(
  operation: 'add' | 'remove' | 'clear',
  tagInput?: string[] | string,
): Promise<void> {
  const filePath = await activeGoFile()
  if (!filePath) return

  const doc = await coc.workspace.document
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
    const args = ['-file', targetFile, '-format', 'json']

    const mode = await coc.workspace.nvim.call('mode') as string
    const isVisual = mode.startsWith('v') || mode.startsWith('V') || mode === '\x16'

    if (isVisual) {
      const visualMode = await coc.workspace.nvim.call('visualmode') as string
      const range = visualMode ? await coc.window.getSelectedRange(visualMode) : null
      if (range) {
        const startLine = range.start.line + 1
        const endLine = range.end.line + 1
        args.push('-line', startLine === endLine ? `${startLine}` : `${startLine},${endLine}`)
      }
    }

    if (!args.includes('-line')) {
      const { position } = await coc.workspace.getCurrentState()
      const lineText = doc.getline(position.line)
      const trimmedLine = lineText.trimStart()

      const byteOffsetAt = (line: number, character: number): number =>
        Buffer.byteLength(
          doc.content.slice(0, doc.textDocument.offsetAt(coc.Position.create(line, character))),
          'utf8',
        )

      const structName = /^type\s+(\w+)(?:\[.*\])?\s*struct\s*\{/.exec(trimmedLine)?.[1]

      if (structName) {
        args.push('-struct', structName)
      } else if (trimmedLine === '}') {
        args.push('-offset', `${byteOffsetAt(position.line, 0) - 1}`)
      } else if (lineText.slice(0, position.character).trim() === '') {
        args.push('-offset', `${byteOffsetAt(position.line, position.character)}`)
      } else {
        args.push('-line', `${position.line + 1}`)
      }
    }

    if (operation === 'clear') {
      args.push('-clear-tags', '-clear-options')
    } else {
      if (tagInput === undefined) {
        tagInput = await coc.window.requestInput(
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

    const result = await runTool('gomodifytags', args, { cwd: dirname(filePath), quiet: true })
    if (!result || result.code !== 0) {
      coc.window.showErrorMessage(`gomodifytags failed (code ${result?.code}): ${result?.output?.trim() || 'no output'}`)
      return
    }

    let parsed: ModifyTagsOutput
    try {
      parsed = JSON.parse(result.stdout) as ModifyTagsOutput
    } catch {
      coc.window.showErrorMessage(`Failed to parse gomodifytags output: ${result.stdout}`)
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

export function registerTagCommands(context: ExtensionContext): void {
  registerCommand(context, 'go.tags.add', async (tags?: string[] | string) => runModifyTags('add', tags))
  registerCommand(context, 'go.tags.remove', async (tags?: string[] | string) => runModifyTags('remove', tags))
  registerCommand(context, 'go.tags.clear', async () => runModifyTags('clear'))
}
