import type { Ctx } from '../ctx'
import { window } from 'coc.nvim'
import { activeDirectory } from '../editor/editor'

// Commands that operate on go.mod / go.work and the module graph. They run in
// the terminal when they can prompt or modify state interactively, and through
// the output channel when their output is what the user wants to read.
export class ModuleCommands {
  constructor(private readonly ctx: Ctx) {}

  private async requestInput(prompt: string, placeHolder?: string): Promise<string | undefined> {
    const value = await window.requestInput(prompt, placeHolder)
    return value?.trim() || undefined
  }

  // Runs `go <subcommand> <args>` in the active directory, through the output channel.
  private inOutput(subcommand: string, args: string[]): Promise<unknown> {
    return activeDirectory().then(cwd => this.ctx.process.go(subcommand, args, { cwd }))
  }

  private modEditCommand(id: string, flag: string, prompt: string): void {
    this.ctx.commands.handle(id, async (value?: string) => {
      value ??= await this.requestInput(prompt)
      if (!value) return
      await this.inOutput('mod', ['edit', `${flag}=${value}`])
    })
  }

  register(): void {
    this.ctx.commands.handle('go.mod.tidy', () => this.inOutput('mod', ['tidy']))
    this.ctx.commands.handle('go.mod.vendor', () => this.inOutput('mod', ['vendor']))
    this.ctx.commands.handle('go.mod.download', () => this.inOutput('mod', ['download']))

    this.ctx.commands.handle('go.mod.init', async (modulePath?: string) => {
      modulePath ??= await window.requestInput('Module path (e.g. example.com/project)')
      if (!modulePath) return
      await this.ctx.terminal.runGo('mod', ['init', modulePath], { cwd: await activeDirectory() })
    })

    this.ctx.commands.handle('go.mod.verify', async () => {
      await this.inOutput('mod', ['verify'])
      this.ctx.output.show()
    })

    this.ctx.commands.handle('go.mod.why', async (target?: string) => {
      target ??= await this.requestInput('Package or module path')
      if (!target) return
      await this.inOutput('mod', ['why', ...target.split(/\s+/)])
      this.ctx.output.show()
    })

    this.ctx.commands.handle('go.mod.graph', async () => {
      await this.inOutput('mod', ['graph'])
      this.ctx.output.show()
    })

    this.modEditCommand('go.mod.edit.require', '-require', 'Module path and version (e.g. example.com/dependency@v1.2.3)')
    this.modEditCommand('go.mod.edit.replace', '-replace', 'Replacement (e.g. example.com/dependency=../local)')
    this.modEditCommand('go.mod.edit.droprequire', '-droprequire', 'Module path to drop')

    this.ctx.commands.handle('go.work.sync', () =>
      activeDirectory().then(cwd => this.ctx.process.go('work', ['sync'], { cwd })))
    this.ctx.commands.handle('go.work.init', () =>
      activeDirectory().then(cwd => this.ctx.terminal.runGo('work', ['init'], { cwd })))
    this.ctx.commands.handle('go.work.use', async (directory?: string) => {
      directory ??= await this.requestInput('Module directory to add to the workspace', '.')
      if (!directory) return
      await this.inOutput('work', ['use', directory])
    })

    this.ctx.commands.handle('go.get.package', async (packagePath?: string) => {
      packagePath ??= await window.requestInput('Go module or package path')
      if (!packagePath) return
      await this.ctx.terminal.runGo('get', [packagePath], { cwd: await activeDirectory() })
    })
    this.ctx.commands.handle('go.get.upgrade', () =>
      activeDirectory().then(cwd => this.ctx.terminal.runGo('get', ['-u', './...'], { cwd })))
    this.ctx.commands.handle('go.install.package', async (packagePath?: string) => {
      packagePath ??= await window.requestInput('Go package path')
      if (!packagePath) return
      await this.ctx.terminal.runGo('install', [...this.ctx.config.buildFlags(), packagePath], {
        cwd: await activeDirectory(),
      })
    })
  }
}
