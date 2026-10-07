import type { ExtensionContext } from 'coc.nvim'
import * as coc from 'coc.nvim'
import { configValue, goCommand } from '../config'
import { goEnvironment, resolveExecutable } from '../environment'
import { replaceLanguageClient, restartClient } from '../language-server'
import { appendOutput, runProcess, showCommandOutput, showOutput } from '../process'
import { installTool, toolExecutable, tools } from '../tools'
import { registerCommand } from './register'

async function showGoEnvironment(name?: string): Promise<void> {
  const args = name ? ['env', name] : ['env']
  showCommandOutput(`${goCommand()} ${args.join(' ')}`)
  try {
    const result = await runProcess(goCommand(), args, { cwd: coc.workspace.cwd, env: goEnvironment() })
    if (result.code !== 0) {
      coc.window.showErrorMessage(`go env exited with code ${result.code}`)
    } else if (name) {
      coc.window.showInformationMessage(`${name}: ${result.stdout.trim()}`)
    } else {
      showOutput()
    }
  } catch (error) {
    coc.window.showErrorMessage(`Failed to run go env: ${String(error)}`)
  }
}

async function showVersions(): Promise<void> {
  showCommandOutput(`${goCommand()} version`)
  try {
    const result = await runProcess(goCommand(), ['version'], { cwd: coc.workspace.cwd, env: goEnvironment() })
    const goplsPath = await toolExecutable('gopls')
    let goplsVersion = 'not installed'
    if (goplsPath) {
      const goplsResult = await runProcess(goplsPath, ['version'], { cwd: coc.workspace.cwd, env: goEnvironment() })
      goplsVersion = goplsResult.stdout.trim() || `exit code ${goplsResult.code}`
    }
    const message = `Go ${result.stdout.trim()}; gopls ${goplsVersion}`
    if (result.code === 0) coc.window.showInformationMessage(message)
    else coc.window.showErrorMessage(message)
  } catch (error) {
    coc.window.showErrorMessage(`Failed to run go version: ${String(error)}`)
  }
}

async function locateTools(): Promise<void> {
  showCommandOutput('go locate tools')
  const lines = [`go: ${resolveExecutable(goCommand()) || 'not found'}`]
  for (const name of Object.keys(tools)) {
    const binary = await toolExecutable(name)
    lines.push(`${name}: ${binary || 'not found'}`)
  }
  appendOutput(lines.join('\n'))
  showOutput()
}

export function registerEnvironmentCommands(context: ExtensionContext): void {
  registerCommand(context, 'go.gopath', () => showGoEnvironment('GOPATH'))
  registerCommand(context, 'go.goroot', () => showGoEnvironment('GOROOT'))
  registerCommand(context, 'go.env', () => showGoEnvironment())
  registerCommand(context, 'go.environment.choose', async () => {
    const current = configValue('goroot', '')
    const value = await coc.window.requestInput('GOROOT to use (empty to use Go default)', current)
    if (value === undefined) return
    await coc.workspace.getConfiguration('go').update('goroot', value || undefined, true)
  })
  registerCommand(context, 'go.version', showVersions)
  registerCommand(context, 'go.locate.tools', locateTools)

  registerCommand(context, 'go.tools.install', async () => {
    for (const name of Object.keys(tools)) {
      if (!tools[name].optional) await installTool(name)
    }
  })
  for (const name of Object.keys(tools)) {
    registerCommand(context, `go.tools.install.${name}`, async () => {
      if (await installTool(name) && name === 'gopls') await replaceLanguageClient(context)
    })
  }
  registerCommand(context, 'go.gopls.install', async () => {
    if (await installTool('gopls')) await replaceLanguageClient(context)
  })
  registerCommand(context, 'go.languageserver.restart', restartClient)
}
