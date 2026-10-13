import type { Ctx } from '../ctx'
import { window, workspace } from 'coc.nvim'
import { resolveExecutable, tools } from '../go/tools'

export function registerEnvironmentCommands(ctx: Ctx): void {
  const showGoEnvironment = async (name?: string): Promise<void> => {
    const args = name ? [name] : []
    try {
      const result = await ctx.process.goProcess('env', args, { cwd: workspace.cwd })
      if (result.code !== 0) {
        window.showErrorMessage(`go env exited with code ${result.code}`)
      } else if (name) {
        await window.showNotification({ kind: 'info', title: name, content: result.stdout.trim() })
      } else {
        ctx.output.show()
      }
    } catch (error) {
      window.showErrorMessage(`Failed to run go env: ${String(error)}`)
    }
  }

  const showVersions = async (): Promise<void> => {
    try {
      const result = await ctx.process.goProcess('version', [], { cwd: workspace.cwd })
      const goplsPath = await ctx.tools.executable('gopls')
      let goplsVersion = 'not installed'
      if (goplsPath) {
        const goplsResult = await ctx.process.run(goplsPath, ['version'], {
          cwd: workspace.cwd,
          env: ctx.environment.variables(),
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

  const locateTools = async (): Promise<void> => {
    ctx.output.header('go locate tools')
    const lines = [`go: ${resolveExecutable(ctx.config.goCommand()) || 'not found'}`]
    for (const name of Object.keys(tools)) {
      const binary = await ctx.tools.executable(name)
      lines.push(`${name}: ${binary || 'not found'}`)
    }
    ctx.output.appendLine(lines.join('\n'))
    ctx.output.show()
  }

  const chooseEnvironment = async (): Promise<void> => {
    const current = ctx.config.get('goroot', '')
    const value = await window.requestInput('GOROOT to use (empty to use Go default)', current)
    if (value === undefined) return
    // coc.nvim's requestInput resolves '' from input() or null from the float
    // prompt on cancel instead of undefined, so cancel must not clear the value.
    if (!value) return
    await workspace.getConfiguration('go').update('goroot', value, true)
  }

  ctx.commands.handle('go.gopath', () => showGoEnvironment('GOPATH'))
  ctx.commands.handle('go.goroot', () => showGoEnvironment('GOROOT'))
  ctx.commands.handle('go.env', () => showGoEnvironment())
  ctx.commands.handle('go.environment.choose', () => chooseEnvironment())
  ctx.commands.handle('go.version', () => showVersions())
  ctx.commands.handle('go.locate.tools', () => locateTools())

  ctx.commands.handle('go.tools.install', async () => {
    for (const name of Object.keys(tools)) {
      if (!tools[name].optional) await ctx.tools.install(name)
    }
  })
  for (const name of Object.keys(tools)) {
    ctx.commands.handle(`go.tools.install.${name}`, async () => {
      if (await ctx.tools.install(name) && name === 'gopls') await ctx.languageServer.replace()
    })
  }
  ctx.commands.handle('go.gopls.install', async () => {
    if (await ctx.tools.install('gopls')) await ctx.languageServer.replace()
  })
}
