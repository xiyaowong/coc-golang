import type { Ctx } from '../ctx'
import { dirname } from 'node:path'
import { window } from 'coc.nvim'
import { activeDirectory, activeFile, activeGoFile, fileUri, linesToCursor } from '../editor'
import { functionNameAtCursor, testArgumentsAtCursor } from '../test/utils'

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
    const file = await activeFile()
    implementation ??= await window.requestInput('Receiver and interface (e.g. *MyReader io.Reader)')
    if (!file || !implementation) return
    await ctx.tools.run('impl', ['-dir', dirname(file), ...implementation.trim().split(/\s+/)], { cwd: dirname(file) })
  })
}
