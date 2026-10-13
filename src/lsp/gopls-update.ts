import type { ExtensionContext } from 'coc.nvim'
import * as coc from 'coc.nvim'
import { execFileText } from '../editor/process'
import { configValue, goCommand } from '../go/config'
import { goEnvironment } from '../go/environment'
import { installTool, toolExecutable } from '../go/tools'
import { replaceLanguageClient } from './language-server'

// Checks the module proxy for a newer gopls and offers to update it, unless
// go.toolsManagement.checkForUpdates is off or local-only.
export async function checkGoplsUpdate(context: ExtensionContext): Promise<void> {
  if (configValue('toolsManagement.checkForUpdates', 'proxy') !== 'proxy') return
  const executable = await toolExecutable('gopls')
  if (!executable) return
  const env = goEnvironment()
  try {
    const info = await execFileText(goCommand(), ['version', '-m', executable], { env })
    const match = /^\s*mod\s+(\S+)\s+(v\S+)/m.exec(info)
    if (!match) return
    const [, module, installed] = match
    const latestInfo = await execFileText(goCommand(), ['list', '-m', '-json', `${module}@latest`], { env })
    const latest = (JSON.parse(latestInfo) as { Version?: string }).Version
    if (!latest || latest === installed || installed.includes('-0.')) return
    const autoUpdate = configValue('toolsManagement.autoUpdate', false)
    if (!autoUpdate && !await coc.window.showPrompt(`gopls ${latest} is available (installed: ${installed}). Update now?`)) return
    if (await installTool('gopls')) await replaceLanguageClient(context)
  } catch {
    // Offline or no module proxy access; skip the update check silently.
  }
}
