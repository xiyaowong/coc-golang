import type { CheckKind, CheckScope } from '../check'
import type { Ctx } from '../ctx'
import * as coc from 'coc.nvim'
import { window, workspace } from 'coc.nvim'
import { activeDirectory, workspaceDirectories } from '../editor'
import { toolFailure } from '../go/tools'
import { taskLabels } from '../status'

export function registerBuildCommands(ctx: Ctx): void {
  const checkCommand = (id: string, kind: CheckKind, scope: CheckScope): void => {
    ctx.commands.handle(id, async () => {
      const directories = scope === 'workspace' ? workspaceDirectories() : [await activeDirectory()]
      const done = ctx.statusBar.begin(taskLabels[kind])
      try {
        for (const directory of directories) await ctx.checker.run(kind, scope, { cwd: directory })
      } finally {
        done()
      }
    })
  }

  const packageCommand = (id: string, subcommand: string, args: string[] = ['.'], label?: string): void => {
    ctx.commands.handle(id, async () => {
      await ctx.statusBar.during(label, ctx.process.go(subcommand, args, { cwd: await activeDirectory() }))
    })
  }

  const browsePackages = async (): Promise<void> => {
    const directory = await activeDirectory()
    try {
      const result = await ctx.process.goProcess('list', ['all'], { cwd: directory })
      const packages = [...new Set(result.stdout.split(/\r?\n/).filter(Boolean))]
      if (result.code !== 0 || !packages.length) {
        await window.showNotification({
          kind: 'error',
          title: 'Unable to list Go packages',
          content: toolFailure(`Exit code ${result.code}`, result),
        })
        return
      }
      const selected = await window.showQuickPick(packages, { title: 'Select a Go package', placeHolder: 'Type to filter' })
      if (!selected) return
      await ctx.terminal.runGo('doc', [selected], { cwd: directory })
    } catch (error) {
      window.showErrorMessage(`Failed to list Go packages: ${String(error)}`)
    }
  }

  const toggleVulncheck = async (): Promise<void> => {
    const { document } = await workspace.getCurrentState()
    const config = workspace.getConfiguration('go', document.uri)
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
    if (target === coc.ConfigurationTarget.WorkspaceFolder && !workspace.workspaceFolders.length) {
      window.showWarningMessage(
        'go.diagnostic.vulncheck is not set; a workspace folder is required to store it. Set it in the global settings to toggle without one.',
      )
      return
    }
    await config.update('diagnostic.vulncheck', vulncheck, target)
    await window.showNotification({ kind: 'info', title: 'gopls vulncheck', content: vulncheck })
  }

  for (const [id, kind, scope] of [
    ['go.build.package', 'build', 'package'],
    ['go.vet.package', 'vet', 'package'],
    ['go.lint.package', 'lint', 'package'],
    ['go.build.workspace', 'build', 'workspace'],
    ['go.vet.workspace', 'vet', 'workspace'],
  ] as const) {
    checkCommand(id, kind, scope)
  }

  ctx.commands.handle('go.lint.workspace', async () => {
    await Promise.all(workspaceDirectories().map(
      directory => ctx.checker.run('lint', 'workspace', { cwd: directory }),
    ))
  })

  packageCommand('go.generate.package', 'generate', ['.'], taskLabels.generate)
  packageCommand('go.fmt.package', 'fmt')

  ctx.commands.handle('go.run', async (target?: string) =>
    ctx.terminal.runGo('run', [...ctx.config.buildFlags(), target || '.'], {
      cwd: await activeDirectory(),
      focus: true,
    }))

  ctx.commands.handle('go.vulncheck.toggle', () => toggleVulncheck())
  ctx.commands.handle('go.browse.packages', () => browsePackages())
}
