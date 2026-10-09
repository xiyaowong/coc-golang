import type { ExtensionContext } from 'coc.nvim'
import { basename, dirname, extname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as coc from 'coc.nvim'
import { configValue } from '../config'
import { runTool } from '../tools'
import { activeSchemaFile, fileUri, isSchemaFile } from './editor'
import { registerCommand } from './index'

const goFileSuffix = '.go'

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

async function confirmOverwrite(outputPath: string): Promise<boolean> {
  const document = coc.workspace.getDocument(fileUri(outputPath))
  if (!document) return true
  const modified = await document.buffer.getOption('modified') as boolean
  if (!modified) return true
  return coc.window.showPrompt(`${basename(outputPath)} has unsaved changes. Overwrite it?`)
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

    const args = [
      ...configValue<string[]>('convertFlags', []),
      '-p',
      packageName,
      '-o',
      outputPath,
      schema,
    ]
    const result = await runTool('go-jsonschema', args, { cwd: dirname(schema) })
    if (!result || result.code !== 0) return

    await coc.workspace.openResource(fileUri(outputPath))
  })
}
