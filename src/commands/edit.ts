import type { ExtensionContext } from 'coc.nvim'
import { dirname } from 'node:path'
import * as coc from 'coc.nvim'
import { configValue } from '../config'
import { activeDirectory, activeFile, fileUri, linesToCursor, wordAtCursor } from '../editor'
import { testArgumentsAtCursor } from '../go-test-utils'
import { getClient } from '../language-server'
import { runTool } from '../tools'
import { registerCommand } from './register'

const gotestsArguments = (...args: string[]): string[] => [
  ...configValue<string[]>('generateTestsFlags', []),
  ...args,
]

async function addImport(importPath?: string): Promise<void> {
  const file = await activeFile()
  if (!file?.endsWith('.go')) {
    coc.window.showMessage('Open a Go file first.', 'warning')
    return
  }
  const client = getClient()
  if (!client) {
    coc.window.showMessage('gopls is not running.', 'warning')
    return
  }
  const uri = fileUri(file)
  let pkg = typeof importPath === 'string' ? importPath.trim() : ''
  if (!pkg) {
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
      const selected = await coc.window.showQuickpick(packages, 'Select a package to import')
      if (selected < 0 || selected >= packages.length) return
      pkg = packages[selected]
    } else {
      pkg = (await coc.window.requestInput('Import path'))?.trim() ?? ''
    }
  }
  if (!pkg) return
  try {
    await client.sendRequest('workspace/executeCommand', {
      command: 'gopls.add_import',
      arguments: [{ ImportPath: pkg, URI: uri }],
    })
  } catch (error) {
    coc.window.showMessage(`Failed to add import: ${String(error)}`, 'error')
  }
}

async function generateTestForFunction(): Promise<void> {
  const lines = await linesToCursor()
  const args = testArgumentsAtCursor(lines)
  if (!args || args.includes('-bench')) {
    coc.window.showMessage('Place the cursor inside a Go test or example function.', 'warning')
    return
  }
  const match = /^\s*func\s+(?:\([^)]*\)\s*)?([A-Za-z_]\w*)\s*\(/.exec(
    (Array.isArray(lines) ? lines : String(lines).split('\n')).slice().reverse().find(
      line => /^\s*func\s+(?:\([^)]*\)\s*)?[A-Za-z_]\w*\s*\(/.test(line),
    ) || '',
  )
  if (!match) return
  const file = await activeFile()
  if (file) await runTool('gotests', gotestsArguments('-w', '-only', `^${match[1]}$`, file), dirname(file))
}

async function runModifyTags(
  operation: 'add' | 'remove' | 'clear',
  tagInput?: string[] | string,
): Promise<void> {
  const file = await activeFile()
  if (!file) {
    coc.window.showMessage('Open a Go file first.', 'warning')
    return
  }
  const structName = await wordAtCursor()
  if (!structName) {
    coc.window.showMessage('Place the cursor on a Go struct name.', 'warning')
    return
  }
  if (operation !== 'clear' && tagInput === undefined) {
    tagInput = await coc.window.requestInput(`${operation === 'add' ? 'Tags to add' : 'Tags to remove'} (comma-separated)`)
  }
  const tags = typeof tagInput === 'string'
    ? tagInput.split(',').map(tag => tag.trim()).filter(Boolean)
    : tagInput ?? []
  const args = ['-file', file, '-struct', structName, '-w']
  if (operation === 'add' && tags.length) {
    args.push('-add-tags', tags.join(','))
  } else if (operation === 'remove' && tags.length) {
    args.push('-remove-tags', tags.join(','))
  } else if (operation === 'clear') {
    args.push('-clear-tags')
  } else {
    coc.window.showMessage('Provide one or more tag names.', 'warning')
    return
  }
  await runTool('gomodifytags', args, dirname(file))
}

export function registerEditCommands(context: ExtensionContext): void {
  registerCommand(context, 'go.import.organize', async () => {
    await coc.commands.executeCommand('editor.action.organizeImport')
  })
  registerCommand(context, 'go.import.add', addImport)

  registerCommand(context, 'go.test.generate.file', async () => {
    const file = await activeFile()
    if (!file) {
      coc.window.showMessage('Open a Go file first.', 'warning')
      return
    }
    await runTool('gotests', gotestsArguments('-w', '-all', file), dirname(file))
  })
  registerCommand(context, 'go.test.generate.package', async () =>
    runTool('gotests', gotestsArguments('-w', '-all', '.'), await activeDirectory()))
  registerCommand(context, 'go.test.generate.function', generateTestForFunction)

  registerCommand(context, 'go.tags.add', async (tags?: string[] | string) => runModifyTags('add', tags))
  registerCommand(context, 'go.tags.remove', async (tags?: string[] | string) => runModifyTags('remove', tags))
  registerCommand(context, 'go.tags.clear', async () => runModifyTags('clear'))
  registerCommand(context, 'go.impl.cursor', async (implementation?: string) => {
    const file = await activeFile()
    implementation ??= await coc.window.requestInput('Receiver and interface (e.g. *MyReader io.Reader)')
    if (!file || !implementation) return
    await runTool('impl', ['-dir', dirname(file), ...implementation.trim().split(/\s+/)], dirname(file))
  })
}
