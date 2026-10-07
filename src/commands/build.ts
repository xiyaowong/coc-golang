import type { ExtensionContext } from 'coc.nvim'
import * as coc from 'coc.nvim'
import { runCheck } from '../check'
import { goBuildFlags, goCommand } from '../config'
import { activeDirectory, workspaceDirectories } from '../editor'
import { goEnvironment } from '../environment'
import { runGo, runProcess, showCommandOutput } from '../process'
import { runTool } from '../tools'
import { registerCommand } from './register'

async function browsePackages(): Promise<void> {
  const directory = await activeDirectory()
  showCommandOutput(`${goCommand()} list all`)
  try {
    const result = await runProcess(goCommand(), ['list', 'all'], directory, goEnvironment())
    const packages = [...new Set(result.stdout.split(/\r?\n/).filter(Boolean))]
    if (result.code !== 0 || !packages.length) {
      coc.window.showMessage(`Unable to list Go packages (exit code ${result.code}).`, 'error')
      return
    }
    const selected = await coc.window.showQuickpick(packages, 'Select a Go package')
    if (selected < 0 || selected >= packages.length) return
    await runGo('doc', [packages[selected]], directory)
  } catch (error) {
    coc.window.showMessage(`Failed to list Go packages: ${String(error)}`, 'error')
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
    runGo('run', [...goBuildFlags(), target || '.'], await cwd()))
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

  registerCommand(context, 'go.vulncheck.package', async () =>
    runTool('govulncheck', ['.'], await cwd()))
  registerCommand(context, 'go.vulncheck.workspace', async () => {
    for (const directory of workspaceDirectories()) await runTool('govulncheck', ['./...'], directory)
  })
  registerCommand(context, 'go.vulncheck.toggle', async () => {
    const config = coc.workspace.getConfiguration('go')
    const vulncheck = config.get<string>('diagnostic.vulncheck', 'Prompt') === 'Imports' ? 'Off' : 'Imports'
    await config.update('diagnostic.vulncheck', vulncheck, true)
    coc.window.showMessage(`gopls vulncheck: ${vulncheck}`)
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
