import type { ExtensionContext } from 'coc.nvim'
import type { CheckScope } from './check'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as coc from 'coc.nvim'
import { runCheck } from './check'
import { registerCommands } from './commands'
import { configValue, restartSettings } from './config'
import { activateTerminalEnvironment } from './environment'
import { disposeFormatProvider, refreshFormatProvider } from './format'
import {
  applyTrace,
  checkGoplsUpdate,
  replaceLanguageClient,
  startLanguageClient,
  stopLanguageClient,
} from './language-server'
import { createOutputChannel, disposeOutputChannel, killAllProcesses } from './process'
import { runTests } from './test'

function registerConfigurationHandler(context: ExtensionContext): void {
  context.subscriptions.push(coc.workspace.onDidChangeConfiguration(async (event) => {
    if (event.affectsConfiguration('go.trace.server')) applyTrace()
    if (
      event.affectsConfiguration('go.formatTool')
      || event.affectsConfiguration('go.useLanguageServer')
      || event.affectsConfiguration('go.alternateTools')
    ) {
      refreshFormatProvider(context)
    }
    if (
      event.affectsConfiguration('go.terminal')
      || event.affectsConfiguration('go.goroot')
      || event.affectsConfiguration('go.gopath')
      || event.affectsConfiguration('go.inferGopath')
      || event.affectsConfiguration('go.toolsEnvVars')
      || event.affectsConfiguration('go.alternateTools')
    ) {
      await activateTerminalEnvironment()
    }
    if (restartSettings.some(name => event.affectsConfiguration(name))) {
      await replaceLanguageClient(context)
    }
  }))
}

function registerSaveHandler(context: ExtensionContext): void {
  context.subscriptions.push(coc.workspace.onDidSaveTextDocument(async (document) => {
    if (document.languageId !== 'go' || !document.uri.startsWith('file:')) return
    const file = fileURLToPath(document.uri)
    const directory = dirname(file)
    if (!configValue('useLanguageServer', true)) {
      const build = configValue<string>('buildOnSave', 'package')
      if (build !== 'off') await runCheck('build', build as CheckScope, directory, file)
      const vet = configValue<string>('vetOnSave', 'package')
      if (vet !== 'off') await runCheck('vet', vet as CheckScope, directory, file)
    }
    const lint = configValue<string>('lintOnSave', 'package')
    if (lint !== 'off' && configValue('lintTool', '')) await runCheck('lint', lint as CheckScope, directory, file)
    if (configValue('testOnSave', false)) await runTests([], directory)
  }))
}

export async function activate(context: ExtensionContext): Promise<void> {
  context.subscriptions.push(createOutputChannel())
  context.subscriptions.push({ dispose: killAllProcesses })
  registerCommands(context)

  await startLanguageClient(context)
  refreshFormatProvider(context)
  await activateTerminalEnvironment()
  void checkGoplsUpdate(context)

  registerConfigurationHandler(context)
  registerSaveHandler(context)
}

export async function deactivate(): Promise<void> {
  disposeFormatProvider()
  await stopLanguageClient()
  killAllProcesses()
  disposeOutputChannel()
}
