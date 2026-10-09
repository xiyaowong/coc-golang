import type { ExtensionContext } from 'coc.nvim'
import { dirname } from 'node:path'
import * as coc from 'coc.nvim'
import { configValue } from '../config'
import { activeDirectory, activeFile, activeGoFile, fileUri, linesToCursor } from '../editor'
import { functionNameAtCursor, testArgumentsAtCursor } from '../go-test-utils'
import { getClient } from '../language-server'
import { runTool } from '../tools'
import { registerCommand } from './register'

const gotestsArguments = (...args: string[]): string[] => [
  ...configValue<string[]>('generateTestsFlags', []),
  ...args,
]

async function addImport(importPath?: string): Promise<void> {
  const file = await activeGoFile()
  if (!file) return
  const client = getClient()
  if (!client) {
    coc.window.showWarningMessage('gopls is not running.')
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
      const picked = await coc.window.showQuickPick(packages, { title: 'Select a package to import', placeHolder: 'Type to filter' })
      if (!picked) return
      selected = picked
    } else {
      selected = (await coc.window.requestInput('Import path'))?.trim() ?? ''
    }
  }
  if (!selected) return
  try {
    await client.sendRequest('workspace/executeCommand', {
      command: 'gopls.add_import',
      arguments: [{ ImportPath: selected, URI: uri }],
    })
  } catch (error) {
    coc.window.showErrorMessage(`Failed to add import: ${String(error)}`)
  }
}

async function generateTestForFunction(): Promise<void> {
  const lines = await linesToCursor()
  const args = testArgumentsAtCursor(lines)
  if (!args || args.includes('-bench')) {
    coc.window.showWarningMessage('Place the cursor inside a Go test or example function.')
    return
  }
  const functionName = functionNameAtCursor(lines)
  if (!functionName) return
  const file = await activeFile()
  if (file) await runTool('gotests', gotestsArguments('-w', '-only', `^${functionName}$`, file), { cwd: dirname(file) })
}

export function registerEditCommands(context: ExtensionContext): void {
  registerCommand(context, 'go.import.organize', async () => {
    await coc.commands.executeCommand('editor.action.organizeImport')
  })
  registerCommand(context, 'go.import.add', addImport)

  registerCommand(context, 'go.test.generate.file', async () => {
    const file = await activeGoFile()
    if (!file) return
    await runTool('gotests', gotestsArguments('-w', '-all', file), { cwd: dirname(file) })
  })
  registerCommand(context, 'go.test.generate.package', async () =>
    runTool('gotests', gotestsArguments('-w', '-all', '.'), { cwd: await activeDirectory() }))
  registerCommand(context, 'go.test.generate.function', generateTestForFunction)

  registerCommand(context, 'go.impl.cursor', async (implementation?: string) => {
    const file = await activeFile()
    implementation ??= await coc.window.requestInput('Receiver and interface (e.g. *MyReader io.Reader)')
    if (!file || !implementation) return
    await runTool('impl', ['-dir', dirname(file), ...implementation.trim().split(/\s+/)], { cwd: dirname(file) })
  })
}
