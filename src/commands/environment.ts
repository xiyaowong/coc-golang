import type { Ctx } from '../ctx'
import { window, workspace } from 'coc.nvim'
import { resolveExecutable } from '../go/executable'
import { tools } from '../go/tools'

export class EnvironmentCommands {
  constructor(private readonly ctx: Ctx) {}

  private async showGoEnvironment(name?: string): Promise<void> {
    const args = name ? [name] : []
    try {
      const result = await this.ctx.process.goProcess('env', args, { cwd: workspace.cwd })
      if (result.code !== 0) {
        window.showErrorMessage(`go env exited with code ${result.code}`)
      } else if (name) {
        await window.showNotification({ kind: 'info', title: name, content: result.stdout.trim() })
      } else {
        this.ctx.output.show()
      }
    } catch (error) {
      window.showErrorMessage(`Failed to run go env: ${String(error)}`)
    }
  }

  private async showVersions(): Promise<void> {
    try {
      const result = await this.ctx.process.goProcess('version', [], { cwd: workspace.cwd })
      const goplsPath = await this.ctx.tools.executable('gopls')
      let goplsVersion = 'not installed'
      if (goplsPath) {
        const goplsResult = await this.ctx.process.run(goplsPath, ['version'], {
          cwd: workspace.cwd,
          env: this.ctx.environment.variables(),
        })
        goplsVersion = goplsResult.stdout.trim() || `exit code ${goplsResult.code}`
      }
      await window.showNotification({
        kind: result.code === 0 ? 'info' : 'error',
        title: `Go ${result.stdout.trim()}`,
        content: `gopls ${goplsVersion}`,
      })
    } catch (error) {
      window.showErrorMessage(`Failed to run go version: ${String(error)}`)
    }
  }

  private async locateTools(): Promise<void> {
    this.ctx.output.header('go locate tools')
    const lines = [`go: ${resolveExecutable(this.ctx.config.goCommand()) || 'not found'}`]
    for (const name of Object.keys(tools)) {
      const binary = await this.ctx.tools.executable(name)
      lines.push(`${name}: ${binary || 'not found'}`)
    }
    this.ctx.output.appendLine(lines.join('\n'))
    this.ctx.output.show()
  }

  private async chooseEnvironment(): Promise<void> {
    const current = this.ctx.config.get('goroot', '')
    const value = await window.requestInput('GOROOT to use (empty to use Go default)', current)
    if (value === undefined) return
    // coc.nvim's requestInput resolves '' from input() or null from the float
    // prompt on cancel instead of undefined, so cancel must not clear the value.
    if (!value) return
    await workspace.getConfiguration('go').update('goroot', value, true)
  }

  register(): void {
    this.ctx.commands.handle('go.gopath', () => this.showGoEnvironment('GOPATH'))
    this.ctx.commands.handle('go.goroot', () => this.showGoEnvironment('GOROOT'))
    this.ctx.commands.handle('go.env', () => this.showGoEnvironment())
    this.ctx.commands.handle('go.environment.choose', () => this.chooseEnvironment())
    this.ctx.commands.handle('go.version', () => this.showVersions())
    this.ctx.commands.handle('go.locate.tools', () => this.locateTools())

    this.ctx.commands.handle('go.tools.install', async () => {
      for (const name of Object.keys(tools)) {
        if (!tools[name].optional) await this.ctx.tools.install(name)
      }
    })
    for (const name of Object.keys(tools)) {
      this.ctx.commands.handle(`go.tools.install.${name}`, async () => {
        if (await this.ctx.tools.install(name) && name === 'gopls') await this.ctx.languageServer.replace()
      })
    }
    this.ctx.commands.handle('go.gopls.install', async () => {
      if (await this.ctx.tools.install('gopls')) await this.ctx.languageServer.replace()
    })
  }
}
