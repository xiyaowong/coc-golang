import type { CheckKind, CheckScope } from '../check/check'
import type { Ctx } from '../ctx'
import * as coc from 'coc.nvim'
import { window, workspace } from 'coc.nvim'
import { activeDirectory, workspaceDirectories } from '../editor/editor'
import { toolFailure } from '../go/tools'

export class BuildCommands {
  constructor(private readonly ctx: Ctx) {}

  private checkCommand(id: string, kind: CheckKind, scope: CheckScope): void {
    this.ctx.commands.handle(id, async () => {
      const directories = scope === 'workspace' ? workspaceDirectories() : [await activeDirectory()]
      for (const directory of directories) await this.ctx.checker.run(kind, scope, { cwd: directory })
    })
  }

  private packageCommand(id: string, subcommand: string, args: string[] = ['.']): void {
    this.ctx.commands.handle(id, async () => {
      await this.ctx.process.go(subcommand, args, { cwd: await activeDirectory() })
    })
  }

  private async browsePackages(): Promise<void> {
    const directory = await activeDirectory()
    try {
      const result = await this.ctx.process.goProcess('list', ['all'], { cwd: directory })
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
      await this.ctx.terminal.runGo('doc', [selected], { cwd: directory })
    } catch (error) {
      window.showErrorMessage(`Failed to list Go packages: ${String(error)}`)
    }
  }

  private async toggleVulncheck(): Promise<void> {
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

  register(): void {
    for (const [id, kind, scope] of [
      ['go.build.package', 'build', 'package'],
      ['go.vet.package', 'vet', 'package'],
      ['go.lint.package', 'lint', 'package'],
      ['go.build.workspace', 'build', 'workspace'],
      ['go.vet.workspace', 'vet', 'workspace'],
    ] as const) {
      this.checkCommand(id, kind, scope)
    }

    this.ctx.commands.handle('go.lint.workspace', async () => {
      await Promise.all(workspaceDirectories().map(
        directory => this.ctx.checker.run('lint', 'workspace', { cwd: directory }),
      ))
    })

    this.packageCommand('go.generate.package', 'generate')
    this.packageCommand('go.fmt.package', 'fmt')

    this.ctx.commands.handle('go.run', async (target?: string) =>
      this.ctx.terminal.runGo('run', [...this.ctx.config.buildFlags(), target || '.'], {
        cwd: await activeDirectory(),
        focus: true,
      }))

    this.ctx.commands.handle('go.vulncheck.toggle', () => this.toggleVulncheck())
    this.ctx.commands.handle('go.browse.packages', () => this.browsePackages())
  }
}
