import type { Ctx } from '../ctx'
import { window } from 'coc.nvim'

// Checks the module proxy for a newer gopls and offers to update it, unless
// go.toolsManagement.checkForUpdates is off or local-only.
export async function checkGoplsUpdate(ctx: Ctx): Promise<void> {
  if (ctx.config.get('toolsManagement.checkForUpdates', 'proxy') !== 'proxy') return
  const executable = await ctx.tools.executable('gopls')
  if (!executable) return
  const env = ctx.environment.variables()
  try {
    const info = await ctx.process.execFileText(ctx.config.goCommand(), ['version', '-m', executable], { env })
    const match = /^\s*mod\s+(\S+)\s+(v\S+)/m.exec(info)
    if (!match) return
    const [, module, installed] = match
    const latestInfo = await ctx.process.execFileText(ctx.config.goCommand(), ['list', '-m', '-json', `${module}@latest`], { env })
    const latest = (JSON.parse(latestInfo) as { Version?: string }).Version
    if (!latest || latest === installed || installed.includes('-0.')) return
    const autoUpdate = ctx.config.get('toolsManagement.autoUpdate', false)
    if (!autoUpdate && !await window.showPrompt(`gopls ${latest} is available (installed: ${installed}). Update now?`)) return
    if (await ctx.tools.install('gopls')) await ctx.languageServer.replace()
  } catch {
    // Offline or no module proxy access; skip the update check silently.
  }
}
