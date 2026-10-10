import type { ExtensionContext } from 'coc.nvim'
import type { CheckKind, CheckScope } from '../check'
import * as coc from 'coc.nvim'
import { runCheck } from '../check'
import { goBuildFlags } from '../config'
import { activeDirectory, workspaceDirectories } from '../editor'
import { runGo, runGoProcess } from '../process'
import { runGoInTerminal } from '../terminal'
import { toolFailure } from '../tools'
import { registerCommand } from './index'

async function browsePackages(): Promise<void> {
  const directory = await activeDirectory()
  try {
    const result = await runGoProcess('list', ['all'], { cwd: directory })
    const packages = [...new Set(result.stdout.split(/\r?\n/).filter(Boolean))]
    if (result.code !== 0 || !packages.length) {
      await coc.window.showNotification({
        kind: 'error',
        title: 'Unable to list Go packages',
        content: toolFailure(`Exit code ${result.code}`, result),
      })
      return
    }
    const selected = await coc.window.showQuickPick(packages, { title: 'Select a Go package', placeHolder: 'Type to filter' })
    if (!selected) return
    await runGoInTerminal('doc', [selected], { cwd: directory })
  } catch (error) {
    coc.window.showErrorMessage(`Failed to list Go packages: ${String(error)}`)
  }
}

export function registerBuildCommands(context: ExtensionContext): void {
  const packageCommand = (id: string, subcommand: string, args: string[] = ['.']): void => {
    registerCommand(context, id, async () => {
      await runGo(subcommand, args, { cwd: await activeDirectory() })
    })
  }

  const checkCommand = (id: string, kind: CheckKind, scope: CheckScope): void => {
    registerCommand(context, id, async () => {
      const directories = scope === 'workspace' ? workspaceDirectories() : [await activeDirectory()]
      for (const directory of directories) await runCheck(kind, scope, { cwd: directory })
    })
  }

  registerCommand(context, 'go.lint.workspace', async () => {
    await Promise.all(workspaceDirectories().map(directory => runCheck('lint', 'workspace', { cwd: directory })))
  })

  for (const [id, kind, scope] of [
    ['go.build.package', 'build', 'package'],
    ['go.vet.package', 'vet', 'package'],
    ['go.lint.package', 'lint', 'package'],
    ['go.build.workspace', 'build', 'workspace'],
    ['go.vet.workspace', 'vet', 'workspace'],
  ] as const) {
    checkCommand(id, kind, scope)
  }

  packageCommand('go.generate.package', 'generate')
  packageCommand('go.fmt.package', 'fmt')

  registerCommand(context, 'go.run', async (target?: string) =>
    runGoInTerminal('run', [...goBuildFlags(), target || '.'], { cwd: await activeDirectory(), focus: true }))

  registerCommand(context, 'go.vulncheck.toggle', async () => {
    const { document } = await coc.workspace.getCurrentState()
    const config = coc.workspace.getConfiguration('go', document.uri)
    const inspect = config.inspect<string>('diagnostic.vulncheck')
    const configured = inspect?.workspaceFolderValue ?? inspect?.workspaceValue ?? inspect?.globalValue
    const current = configured ?? config.get<string>('diagnostic.vulncheck', 'Imports')
    const vulncheck = current === 'Imports' ? 'Off' : 'Imports'
    // coc.nvim treats a missing target as WorkspaceFolder and has no Workspace scope
    // (ConfigurationTarget.Workspace is 'Not exists with coc.nvim yet'), so an
    // existing value is updated at its own scope and a new one requires a folder.
    const target = inspect?.workspaceFolderValue !== undefined
      ? coc.ConfigurationTarget.WorkspaceFolder
      : inspect?.globalValue !== undefined
        ? coc.ConfigurationTarget.Global
        : coc.ConfigurationTarget.WorkspaceFolder
    if (target === coc.ConfigurationTarget.WorkspaceFolder && !coc.workspace.workspaceFolders.length) {
      coc.window.showWarningMessage(
        'go.diagnostic.vulncheck is not set; a workspace folder is required to store it. Set it in the global settings to toggle without one.',
      )
      return
    }
    await config.update('diagnostic.vulncheck', vulncheck, target)
    await coc.window.showNotification({ kind: 'info', title: 'gopls vulncheck', content: vulncheck })
  })

  registerCommand(context, 'go.browse.packages', browsePackages)
}
