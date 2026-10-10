import type { ExtensionContext } from 'coc.nvim'
import * as coc from 'coc.nvim'
import { goBuildFlags } from '../config'
import { activeDirectory } from '../editor'
import { showOutput } from '../output'
import { runGo } from '../process'
import { runGoInTerminal } from '../terminal'
import { registerCommand } from './index'

// Commands that operate on go.mod / go.work and the module graph. They run in
// the terminal when they can prompt or modify state interactively, and through
// the output channel when their output is what the user wants to read.
export function registerModuleCommands(context: ExtensionContext): void {
  registerCommand(context, 'go.mod.tidy', async () =>
    runGo('mod', ['tidy'], { cwd: await activeDirectory() }))
  registerCommand(context, 'go.mod.vendor', async () =>
    runGo('mod', ['vendor'], { cwd: await activeDirectory() }))
  registerCommand(context, 'go.mod.download', async () =>
    runGo('mod', ['download'], { cwd: await activeDirectory() }))

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

  registerCommand(context, 'go.work.sync', async () =>
    runGo('work', ['sync'], { cwd: await activeDirectory() }))
  registerCommand(context, 'go.work.init', async () =>
    runGoInTerminal('work', ['init'], { cwd: await activeDirectory() }))
  registerCommand(context, 'go.work.use', async (directory?: string) => {
    directory ??= (await coc.window.requestInput('Module directory to add to the workspace', '.'))?.trim()
    if (!directory) return
    await runGo('work', ['use', directory], { cwd: await activeDirectory() })
  })

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
}
