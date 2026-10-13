import type { Ctx } from '../ctx'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, extname, isAbsolute, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { window, workspace } from 'coc.nvim'
import { DisposableStore } from '../disposable'
import { activeFile, fileUri } from '../editor/editor'
import { toolFailure } from '../go/tools'

const goFileSuffix = '.go'
const schemaFileSuffixes = ['.json', '.yaml', '.yml']

function isSchemaFile(file: string): boolean {
  return schemaFileSuffixes.some(suffix => file.endsWith(suffix))
}

// go-jsonschema parses its file argument as a URL, where a drive letter reads as a scheme.
function toolFilePath(file: string): string {
  return process.platform === 'win32' && isAbsolute(file) ? `\\\\?\\${file}` : file
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

function clipboardText(): Promise<string> {
  const read = async (): Promise<string> => {
    for (const register of ['+', '*']) {
      try {
        const value = await workspace.nvim.call('getreg', [register])
        if (typeof value === 'string' && value.trim()) return value
      } catch {
        // The register may not exist when vim was built without clipboard support.
      }
    }
    return ''
  }
  return read()
}

export class Converter extends DisposableStore {
  constructor(private readonly ctx: Ctx) {
    super()
  }

  private async activeSchemaFile(): Promise<string | undefined> {
    const file = await activeFile()
    if (!file || !isSchemaFile(file)) return undefined
    return file
  }

  private async pickSchemaFile(): Promise<string | undefined> {
    const uris = await workspace.findFiles('**/*.{json,yaml,yml}', '**/node_modules/**')
    const candidates = uris.map(uri => fileURLToPath(uri.toString())).filter(isSchemaFile)
    if (candidates.length === 0) {
      window.showWarningMessage('No JSON Schema files found in the workspace.')
      return undefined
    }
    return await window.showQuickPick(candidates, {
      title: 'Select a JSON Schema file',
      placeHolder: 'Type to filter',
    }) || undefined
  }

  private async pickJsonFile(): Promise<string | undefined> {
    const uris = await workspace.findFiles('**/*.json', '**/node_modules/**')
    const candidates = uris.map(uri => fileURLToPath(uri.toString())).sort()
    if (candidates.length > 0) {
      const picked = await window.showQuickPick(candidates, {
        title: 'Select a JSON file',
        placeHolder: 'Type to filter, or press Esc to enter a path',
      })
      if (picked) return picked
    }
    const typed = await window.requestInput('JSON file path')
    return typed || undefined
  }

  private async confirmOverwrite(outputPath: string): Promise<boolean> {
    const document = workspace.getDocument(fileUri(outputPath))
    if (document) {
      const modified = await document.buffer.getOption('modified') as boolean
      if (modified) return window.showPrompt(`${basename(outputPath)} has unsaved changes. Overwrite it?`)
    }
    if (!existsSync(outputPath)) return true
    return window.showPrompt(`${basename(outputPath)} already exists. Overwrite it?`)
  }

  async fromJsonSchema(): Promise<void> {
    const schema = await this.activeSchemaFile() ?? await this.pickSchemaFile()
    if (!schema) {
      window.showWarningMessage('Open a JSON Schema file first.')
      return
    }

    const packageName = await window.requestInput('Package name for the generated file', packageNameFor(schema))
    if (!packageName) return

    const outputPath = await window.requestInput('Output file', outputPathFor(schema))
    if (!outputPath) return

    if (!await this.confirmOverwrite(outputPath)) return

    const result = await this.ctx.tools.run('go-jsonschema', [toolFilePath(schema), '-p', packageName], { cwd: dirname(schema), quiet: true })
    if (!result) return
    if (result.code !== 0) {
      await window.showNotification({
        kind: 'error',
        title: 'go-jsonschema failed',
        content: toolFailure(`Exit code ${result.code}`, result),
      })
      return
    }
    if (!result.stdout.includes('package ')) {
      await window.showErrorMessage('go-jsonschema produced no Go source.')
      return
    }

    writeFileSync(outputPath, result.stdout)
    await workspace.openResource(fileUri(outputPath))
  }

  async fromJson(): Promise<void> {
    const modes = [
      'From clipboard',
      'From a JSON file',
      'From scratch',
    ]
    const mode = await window.showQuickPick(modes, {
      title: 'Convert JSON to Go',
      placeHolder: 'Choose the JSON to start from',
    })
    if (!mode) return

    // Every mode opens the same session, seeded with a different JSON.
    if (mode === modes[0]) {
      const json = await clipboardText()
      if (!json.trim()) {
        window.showWarningMessage('The clipboard is empty.')
        return
      }
      await this.ctx.convertSession.open(json)
      return
    }

    if (mode === modes[1]) {
      const file = await this.pickJsonFile()
      if (!file) return
      if (!existsSync(file)) {
        window.showWarningMessage(`${file} does not exist.`)
        return
      }
      await this.ctx.convertSession.open(readFileSync(file, 'utf8'))
      return
    }

    await this.ctx.convertSession.open('')
  }
}
