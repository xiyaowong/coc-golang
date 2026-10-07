import type { ExtensionContext } from 'coc.nvim'
import * as coc from 'coc.nvim'
import { runCheck } from '../check'
import { goBuildFlags, goCommand } from '../config'
import { activeDirectory, workspaceDirectories } from '../editor'
import { goEnvironment } from '../environment'
import { runGo, runProcess, showCommandOutput } from '../process'
import { registerCommand } from './register'

async function browsePackages(): Promise<void> {
  const directory = await activeDirectory()
  showCommandOutput(`${goCommand()} list all`)
  try {
    const result = await runProcess(goCommand(), ['list', 'all'], directory, goEnvironment())
    const packages = [...new Set(result.stdout.split(/\r?\n/).filter(Boolean))]
    if (result.code !== 0 || !packages.length) {
      coc.window.showErrorMessage(`Unable to list Go packages (exit code ${result.code}).`)
      return
    }
    const selected = await coc.window.showQuickPick(packages, { title: 'Select a Go package', placeHolder: 'Type to filter' })
    if (!selected) return
    await runGo('doc', [selected], directory, false, {}, true)
  } catch (error) {
    coc.window.showErrorMessage(`Failed to list Go packages: ${String(error)}`)
  }
}

export function registerBuildCommands(context: ExtensionContext): void {
  const cwd = activeDirectory
  const packageCommand = (id: string, subcommand: string, args: string[] = ['.']): void => {
    registerCommand(context, id, async () => {
      await runGo(subcommand, args, await cwd())
    })
  }
  registerCommand(context, 'go.build.package', async () => runCheck('build', 'package', await cwd()))
  registerCommand(context, 'go.vet.package', async () => runCheck('vet', 'package', await cwd()))
  packageCommand('go.generate.package', 'generate')
  packageCommand('go.mod.tidy', 'mod', ['tidy'])
  packageCommand('go.mod.vendor', 'mod', ['vendor'])
  packageCommand('go.work.sync', 'work', ['sync'])
  registerCommand(context, 'go.run', async (target?: string) =>
    runGo('run', [...goBuildFlags(), target || '.'], await cwd(), false, {}, true))
  for (const [id, kind] of [
    ['go.build.workspace', 'build'],
    ['go.vet.workspace', 'vet'],
  ] as const) {
    registerCommand(context, id, async () => {
      for (const directory of workspaceDirectories()) await runCheck(kind, 'workspace', directory)
    })
  }
  registerCommand(context, 'go.lint.package', async () => runCheck('lint', 'package', await cwd()))
  registerCommand(context, 'go.lint.workspace', async () => {
    await Promise.all(workspaceDirectories().map(directory => runCheck('lint', 'workspace', directory)))
  })

  registerCommand(context, 'go.vulncheck.toggle', async () => {
    const { document } = await coc.workspace.getCurrentState()
    const config = coc.workspace.getConfiguration('go', document.uri)
    const inspect = config.inspect<string>('diagnostic.vulncheck')
    const configured = inspect?.workspaceFolderValue ?? inspect?.workspaceValue ?? inspect?.globalValue
    const current = configured ?? config.get<string>('diagnostic.vulncheck', 'Imports')
    const vulncheck = current === 'Imports' ? 'Off' : 'Imports'
    const target = inspect?.workspaceFolderValue !== undefined
      ? undefined
      : inspect?.workspaceValue !== undefined
        ? false
        : inspect?.globalValue !== undefined
          ? true
          : undefined
    await config.update('diagnostic.vulncheck', vulncheck, target)
    coc.window.showInformationMessage(`gopls vulncheck: ${vulncheck}`)
  })

  registerCommand(context, 'go.fmt.package', async () =>
    runGo('fmt', ['.'], await cwd()))
  registerCommand(context, 'go.mod.init', async (modulePath?: string) => {
    modulePath ??= await coc.window.requestInput('Module path (e.g. example.com/project)')
    if (!modulePath) return
    await runGo('mod', ['init', modulePath], await cwd())
  })
  registerCommand(context, 'go.get.package', async (packagePath?: string) => {
    packagePath ??= await coc.window.requestInput('Go module or package path')
    if (!packagePath) return
    await runGo('get', [packagePath], await cwd())
  })
  registerCommand(context, 'go.install.package', async (packagePath?: string) => {
    packagePath ??= await coc.window.requestInput('Go package path')
    if (!packagePath) return
    await runGo('install', [...goBuildFlags(), packagePath], await cwd())
  })
  registerCommand(context, 'go.browse.packages', browsePackages)
}
