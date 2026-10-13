import type { Ctx } from '../ctx'
import { window } from 'coc.nvim'
import { activeDirectory } from '../editor'

// Commands that operate on go.mod / go.work and the module graph. They run in
// the terminal when they can prompt or modify state interactively, and through
// the output channel when their output is what the user wants to read.
export function registerModuleCommands(ctx: Ctx): void {
  const requestInput = async (prompt: string, placeHolder?: string): Promise<string | undefined> => {
    const value = await window.requestInput(prompt, placeHolder)
    return value?.trim() || undefined
  }

  // Runs `go <subcommand> <args>` in the active directory, through the output channel.
  const inOutput = (subcommand: string, args: string[]): Promise<unknown> =>
    activeDirectory().then(cwd => ctx.process.go(subcommand, args, { cwd }))

  const modEditCommand = (id: string, flag: string, prompt: string): void => {
    ctx.commands.handle(id, async (value?: string) => {
      value ??= await requestInput(prompt)
      if (!value) return
      await inOutput('mod', ['edit', `${flag}=${value}`])
    })
  }

  ctx.commands.handle('go.mod.tidy', () => inOutput('mod', ['tidy']))
  ctx.commands.handle('go.mod.vendor', () => inOutput('mod', ['vendor']))
  ctx.commands.handle('go.mod.download', () => inOutput('mod', ['download']))

  ctx.commands.handle('go.mod.init', async (modulePath?: string) => {
    modulePath ??= await window.requestInput('Module path (e.g. example.com/project)')
    if (!modulePath) return
    await ctx.terminal.runGo('mod', ['init', modulePath], { cwd: await activeDirectory() })
  })

  ctx.commands.handle('go.mod.verify', async () => {
    await inOutput('mod', ['verify'])
    ctx.output.show()
  })

  ctx.commands.handle('go.mod.why', async (target?: string) => {
    target ??= await requestInput('Package or module path')
    if (!target) return
    await inOutput('mod', ['why', ...target.split(/\s+/)])
    ctx.output.show()
  })

  ctx.commands.handle('go.mod.graph', async () => {
    await inOutput('mod', ['graph'])
    ctx.output.show()
  })

  modEditCommand('go.mod.edit.require', '-require', 'Module path and version (e.g. example.com/dependency@v1.2.3)')
  modEditCommand('go.mod.edit.replace', '-replace', 'Replacement (e.g. example.com/dependency=../local)')
  modEditCommand('go.mod.edit.droprequire', '-droprequire', 'Module path to drop')

  ctx.commands.handle('go.work.sync', () =>
    activeDirectory().then(cwd => ctx.process.go('work', ['sync'], { cwd })))
  ctx.commands.handle('go.work.init', () =>
    activeDirectory().then(cwd => ctx.terminal.runGo('work', ['init'], { cwd })))
  ctx.commands.handle('go.work.use', async (directory?: string) => {
    directory ??= await requestInput('Module directory to add to the workspace', '.')
    if (!directory) return
    await inOutput('work', ['use', directory])
  })

  ctx.commands.handle('go.get.package', async (packagePath?: string) => {
    packagePath ??= await window.requestInput('Go module or package path')
    if (!packagePath) return
    await ctx.terminal.runGo('get', [packagePath], { cwd: await activeDirectory() })
  })
  ctx.commands.handle('go.get.upgrade', () =>
    activeDirectory().then(cwd => ctx.terminal.runGo('get', ['-u', './...'], { cwd })))
  ctx.commands.handle('go.install.package', async (packagePath?: string) => {
    packagePath ??= await window.requestInput('Go package path')
    if (!packagePath) return
    await ctx.terminal.runGo('install', [...ctx.config.buildFlags(), packagePath], {
      cwd: await activeDirectory(),
    })
  })
}
