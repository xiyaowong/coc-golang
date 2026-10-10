import type { ExtensionContext } from 'coc.nvim'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as coc from 'coc.nvim'
import { jsonToGo } from '../json-to-go'
import { runTool, toolFailure } from '../tools'
import { activeSchemaFile, fileUri, isSchemaFile, toolFilePath } from './editor'
import { registerCommand } from './index'

const goFileSuffix = '.go'
const jsonInputBuffer = 'json-to-go://input'
const jsonOutputBuffer = 'json-to-go://output'

function packageNameFor(file: string): string {
  return basename(dirname(file))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '')
}

function outputPathFor(file: string): string {
  const name = basename(file, extname(file)).replace(/[^a-z0-9]+/gi, '_')
  return join(dirname(file), `${name}${goFileSuffix}`)
}

async function pickSchemaFile(): Promise<string | undefined> {
  const uris = await coc.workspace.findFiles('**/*.{json,yaml,yml}', '**/node_modules/**')
  const candidates = uris.map(uri => fileURLToPath(uri.toString())).filter(isSchemaFile)
  if (candidates.length === 0) {
    coc.window.showWarningMessage('No JSON Schema files found in the workspace.')
    return undefined
  }
  const picked = await coc.window.showQuickPick(candidates, {
    title: 'Select a JSON Schema file',
    placeHolder: 'Type to filter',
  })
  if (!picked) return undefined
  return picked
}

async function pickJsonFile(): Promise<string | undefined> {
  const uris = await coc.workspace.findFiles('**/*.json', '**/node_modules/**')
  const candidates = uris.map(uri => fileURLToPath(uri.toString())).sort()
  if (candidates.length > 0) {
    const picked = await coc.window.showQuickPick(candidates, {
      title: 'Select a JSON file',
      placeHolder: 'Type to filter, or press Esc to enter a path',
    })
    if (picked) return picked
  }
  const typed = await coc.window.requestInput('JSON file path')
  return typed || undefined
}

async function confirmOverwrite(outputPath: string): Promise<boolean> {
  const document = coc.workspace.getDocument(fileUri(outputPath))
  if (document) {
    const modified = await document.buffer.getOption('modified') as boolean
    if (modified) return coc.window.showPrompt(`${basename(outputPath)} has unsaved changes. Overwrite it?`)
  }
  if (!existsSync(outputPath)) return true
  return coc.window.showPrompt(`${basename(outputPath)} already exists. Overwrite it?`)
}

// A scratch buffer the extension owns, reused across invocations by name.
// coc.nvim is disabled for it so the language server never attaches and the
// generated code is shown as-is rather than as a file with errors.
async function scratchBuffer(name: string, filetype: string): Promise<number> {
  const bufnr = await coc.workspace.nvim.call('bufadd', [name]) as number
  await coc.workspace.nvim.call('setbufvar', [bufnr, '&buftype', 'nofile'])
  await coc.workspace.nvim.call('setbufvar', [bufnr, '&bufhidden', 'hide'])
  await coc.workspace.nvim.call('setbufvar', [bufnr, '&swapfile', 0])
  await coc.workspace.nvim.call('setbufvar', [bufnr, '&filetype', filetype])
  await coc.workspace.nvim.call('setbufvar', [bufnr, 'coc_enabled', 0])
  return bufnr
}

async function setBufferLines(bufnr: number, lines: string[], readonly = false): Promise<void> {
  const buffer = coc.workspace.nvim.createBuffer(bufnr)
  await buffer.setOption('modifiable', true)
  await buffer.setLines(lines.length ? lines : [''], { start: 0, end: -1, strictIndexing: false })
  await buffer.setOption('modifiable', !readonly)
}

// Writes to the output buffer are serialized: a live refresh can fire while a
// previous one is still applying its lines, and interleaving the
// modifiable/setLines/modifiable sequence would fail.
let outputQueue: Promise<void> = Promise.resolve()

function writeOutput(bufnr: number, lines: string[]): Promise<void> {
  const next = outputQueue.then(() => setBufferLines(bufnr, lines, true))
  outputQueue = next.catch(() => undefined)
  return next
}

async function revealBuffer(bufnr: number): Promise<void> {
  const windows = await coc.workspace.nvim.call('win_findbuf', [bufnr]) as number[]
  if (Array.isArray(windows) && windows.length > 0) {
    await coc.workspace.nvim.call('win_gotoid', [windows[0]])
    return
  }
  // Split first so a modified buffer in the current window is never unloaded.
  await coc.workspace.nvim.command('rightbelow vsplit')
  await coc.workspace.nvim.command(`buffer ${bufnr}`)
}

function generatedLines(source: string): string[] {
  if (!source.trim()) return ['']
  const result = jsonToGo(source)
  if (result.error) return [`// json-to-go: ${result.error}`]
  return result.go.replace(/\n$/, '').split('\n')
}

async function showGenerated(source: string): Promise<void> {
  const output = await scratchBuffer(jsonOutputBuffer, 'go')
  await writeOutput(output, generatedLines(source))
  await revealBuffer(output)
}

let liveAutocmds: coc.Disposable[] = []

function clearLiveSession(): void {
  for (const disposable of liveAutocmds) disposable.dispose()
  liveAutocmds = []
}

async function editLive(): Promise<void> {
  clearLiveSession()

  const source = await scratchBuffer(jsonInputBuffer, 'json')
  const output = await scratchBuffer(jsonOutputBuffer, 'go')
  await setBufferLines(source, [''])
  await setBufferLines(output, [''])

  const refresh = async (): Promise<void> => {
    const lines = await coc.workspace.nvim.call('getbufline', [source, 1, '$']) as string[]
    await writeOutput(output, generatedLines(lines.join('\n')))
  }

  // The current window keeps its buffer; the scratch buffers open as new
  // splits, so a modified buffer in any of them is never unloaded.
  await coc.workspace.nvim.command('vsplit')
  await coc.workspace.nvim.command(`buffer ${source}`)
  await coc.workspace.nvim.command('vsplit')
  await coc.workspace.nvim.command(`buffer ${output}`)

  const sourceWindows = await coc.workspace.nvim.call('win_findbuf', [source]) as number[]
  if (sourceWindows.length > 0) await coc.workspace.nvim.call('win_gotoid', [sourceWindows[0]])

  liveAutocmds.push(coc.workspace.registerAutocmd({
    event: ['TextChanged', 'TextChangedI'],
    buffer: source,
    callback: () => void refresh(),
  }))
  liveAutocmds.push(coc.workspace.registerAutocmd({
    event: 'BufWipeout',
    buffer: source,
    callback: () => clearLiveSession(),
  }))
}

async function clipboardText(): Promise<string> {
  for (const register of ['+', '*']) {
    try {
      const value = await coc.workspace.nvim.call('getreg', [register])
      if (typeof value === 'string' && value.trim()) return value
    } catch {
      // The register may not exist when vim was built without clipboard support.
    }
  }
  return ''
}

export function registerConvertCommands(context: ExtensionContext): void {
  registerCommand(context, 'go.convert.jsonSchema', async () => {
    const schema = await activeSchemaFile() ?? await pickSchemaFile()
    if (!schema) {
      coc.window.showWarningMessage('Open a JSON Schema file first.')
      return
    }

    const packageName = await coc.window.requestInput('Package name for the generated file', packageNameFor(schema))
    if (!packageName) return

    const outputPath = await coc.window.requestInput('Output file', outputPathFor(schema))
    if (!outputPath) return

    if (!await confirmOverwrite(outputPath)) return

    const result = await runTool('go-jsonschema', [toolFilePath(schema), '-p', packageName], { cwd: dirname(schema), quiet: true })
    if (!result) return
    if (result.code !== 0) {
      await coc.window.showNotification({
        kind: 'error',
        title: 'go-jsonschema failed',
        content: toolFailure(`Exit code ${result.code}`, result),
      })
      return
    }
    if (!result.stdout.includes('package ')) {
      await coc.window.showErrorMessage('go-jsonschema produced no Go source.')
      return
    }

    writeFileSync(outputPath, result.stdout)
    await coc.workspace.openResource(fileUri(outputPath))
  })

  registerCommand(context, 'go.convert.jsonToGo', async () => {
    const modes = [
      'From clipboard',
      'From a JSON file',
      'From live editing',
    ]
    const mode = await coc.window.showQuickPick(modes, {
      title: 'Convert JSON to Go',
      placeHolder: 'Choose where the JSON comes from',
    })
    if (!mode) return

    if (mode === modes[0]) {
      const json = await clipboardText()
      if (!json.trim()) {
        coc.window.showWarningMessage('The clipboard is empty.')
        return
      }
      await showGenerated(json)
      return
    }

    if (mode === modes[1]) {
      const file = await pickJsonFile()
      if (!file) return
      if (!existsSync(file)) {
        coc.window.showWarningMessage(`${file} does not exist.`)
        return
      }
      await showGenerated(readFileSync(file, 'utf8'))
      return
    }

    await editLive()
  })
}
