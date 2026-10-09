import type { ExtensionContext } from 'coc.nvim'
import type { CheckKind, CheckScope } from './check'
import * as coc from 'coc.nvim'
import { goBuildFlags } from '../config'
import { runGo, runGoInTerminal, runGoProcess, showOutput } from '../process'
import { runCheck } from './check'
import { activeDirectory, workspaceDirectories } from './editor'
import { registerCommand } from './index'

async function browsePackages(): Promise<void> {
  const directory = await activeDirectory()
  try {
    const result = await runGoProcess('list', ['all'], { cwd: directory })
    const packages = [...new Set(result.stdout.split(/\r?\n/).filter(Boolean))]
    if (result.code !== 0 || !packages.length) {
      coc.window.showErrorMessage(`Unable to list Go packages (exit code ${result.code}).`)
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
  packageCommand('go.mod.tidy', 'mod', ['tidy'])
  packageCommand('go.mod.vendor', 'mod', ['vendor'])
  packageCommand('go.mod.download', 'mod', ['download'])
  packageCommand('go.work.sync', 'work', ['sync'])

  registerCommand(context, 'go.work.init', async () => {
    await runGoInTerminal('work', ['init'], { cwd: await activeDirectory() })
  })

  registerCommand(context, 'go.work.use', async (directory?: string) => {
    directory ??= (await coc.window.requestInput('Module directory to add to the workspace', '.'))?.trim()
    if (!directory) return
    await runGo('work', ['use', directory], { cwd: await activeDirectory() })
  })

  registerCommand(context, 'go.run', async (target?: string) =>
    runGoInTerminal('run', [...goBuildFlags(), target || '.'], { cwd: await activeDirectory(), focus: true }))

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
    await coc.window.showNotification({ kind: 'info', title: 'gopls vulncheck', content: vulncheck })
  })

  registerCommand(context, 'go.mod.init', async (modulePath?: string) => {
    modulePath ??= await coc.window.requestInput('Module path (e.g. example.com/project)')
    if (!modulePath) return
    await runGoInTerminal('mod', ['init', modulePath], { cwd: await activeDirectory() })
  })

  registerCommand(context, 'go.mod.verify', async () => {
    await runGo('mod', ['verify'], { cwd: await activeDirectory() })
    showOutput()
  })

  registerCommand(context, 'go.mod.why', async (target?: string) => {
    target ??= (await coc.window.requestInput('Package or module path'))?.trim()
    if (!target) return
    await runGo('mod', ['why', ...target.split(/\s+/)], { cwd: await activeDirectory() })
    showOutput()
  })

  registerCommand(context, 'go.mod.graph', async () => {
    await runGo('mod', ['graph'], { cwd: await activeDirectory() })
    showOutput()
  })

  const modEditCommand = (id: string, flag: string, prompt: string): void => {
    registerCommand(context, id, async (value?: string) => {
      value ??= (await coc.window.requestInput(prompt))?.trim()
      if (!value) return
      await runGo('mod', ['edit', `${flag}=${value}`], { cwd: await activeDirectory() })
    })
  }

  modEditCommand('go.mod.edit.require', '-require', 'Module path and version (e.g. example.com/dependency@v1.2.3)')
  modEditCommand('go.mod.edit.replace', '-replace', 'Replacement (e.g. example.com/dependency=../local)')
  modEditCommand('go.mod.edit.droprequire', '-droprequire', 'Module path to drop')

  registerCommand(context, 'go.get.package', async (packagePath?: string) => {
    packagePath ??= await coc.window.requestInput('Go module or package path')
    if (!packagePath) return
    await runGoInTerminal('get', [packagePath], { cwd: await activeDirectory() })
  })

  registerCommand(context, 'go.get.upgrade', async () => {
    await runGoInTerminal('get', ['-u', './...'], { cwd: await activeDirectory() })
  })

  registerCommand(context, 'go.install.package', async (packagePath?: string) => {
    packagePath ??= await coc.window.requestInput('Go package path')
    if (!packagePath) return
    await runGoInTerminal('install', [...goBuildFlags(), packagePath], { cwd: await activeDirectory() })
  })

  registerCommand(context, 'go.browse.packages', browsePackages)
}
