import type { ExtensionContext } from 'coc.nvim'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, extname, isAbsolute, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as coc from 'coc.nvim'
import { activeFile, fileUri } from '../editor'
import { runTool, toolFailure } from '../tools'
import { registerCommand } from './index'
import { editLive } from './json-to-go-session'

const goFileSuffix = '.go'
const schemaFileSuffixes = ['.json', '.yaml', '.yml']

function isSchemaFile(file: string): boolean {
  return schemaFileSuffixes.some(suffix => file.endsWith(suffix))
}

// go-jsonschema parses its file argument as a URL, where a drive letter reads as a scheme.
function toolFilePath(file: string): string {
  return process.platform === 'win32' && isAbsolute(file) ? `\\\\?\\${file}` : file
}

async function activeSchemaFile(): Promise<string | undefined> {
  const file = await activeFile()
  if (!file || !isSchemaFile(file)) return undefined
  return file
}

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

async function convertJsonSchema(): Promise<void> {
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
}

async function convertJsonToGo(): Promise<void> {
  const modes = [
    'From clipboard',
    'From a JSON file',
    'From scratch',
  ]
  const mode = await coc.window.showQuickPick(modes, {
    title: 'Convert JSON to Go',
    placeHolder: 'Choose the JSON to start from',
  })
  if (!mode) return

  // Every mode opens the same session, seeded with a different JSON.
  if (mode === modes[0]) {
    const json = await clipboardText()
    if (!json.trim()) {
      coc.window.showWarningMessage('The clipboard is empty.')
      return
    }
    await editLive(json)
    return
  }

  if (mode === modes[1]) {
    const file = await pickJsonFile()
    if (!file) return
    if (!existsSync(file)) {
      coc.window.showWarningMessage(`${file} does not exist.`)
      return
    }
    await editLive(readFileSync(file, 'utf8'))
    return
  }

  await editLive('')
}

export function registerConvertCommands(context: ExtensionContext): void {
  registerCommand(context, 'go.convert.jsonSchema', convertJsonSchema)
  registerCommand(context, 'go.convert.jsonToGo', convertJsonToGo)
}
