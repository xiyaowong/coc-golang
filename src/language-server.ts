import type { Disposable, ExtensionContext, LanguageClient } from 'coc.nvim'
import type { GoplsOptions } from './go-config-utils'
import * as coc from 'coc.nvim'
import { configValue } from './config'
import { goEnvironment } from './environment'
import { goplsConfiguration } from './go-config-utils'
import { combineMiddleware, saveSyncMiddleware, workspaceConfigurationMiddleware } from './middleware'
import { installTool, toolExecutable } from './tools'
import { vulncheckMiddleware } from './vulncheck'

let client: LanguageClient | undefined
let clientRegistration: Disposable | undefined

export function getClient(): LanguageClient | undefined {
  return client
}

function goplsOptions(): GoplsOptions {
  const go = coc.workspace.getConfiguration('go')
  const hints = go.get<Record<string, boolean>>('inlayHints', {})
  return goplsConfiguration(coc.workspace.getConfiguration().get<GoplsOptions>('gopls', {}), {
    buildFlags: configValue<string[]>('buildFlags', []),
    buildTags: configValue('buildTags', ''),
    inlayHints: Object.fromEntries(Object.entries(hints).filter(([, value]) => typeof value === 'boolean')),
    vulncheck: configValue<string>('diagnostic.vulncheck', 'Imports'),
    runTestCodeLens: go.get<{ runtest?: boolean }>('enableCodeLens', {}).runtest !== false,
  })
}

export async function restartClient(): Promise<void> {
  const current = client
  if (!current) return
  if (current.needsStop()) await current.stop()
  current.restart()
}

async function makeLanguageClient(): Promise<LanguageClient | undefined> {
  const resolved = await toolExecutable('gopls')
  if (!resolved) return undefined

  const args = [...configValue<string[]>('languageServerFlags', [])]
  if (configValue('goplsUseDaemon', true) && !args.some(value => value.startsWith('-remote'))) {
    args.push('-remote=auto')
  }
  const disabledFeatures = configValue<Record<string, boolean>>('disable', {})
  const disabled = Object.keys(disabledFeatures).filter(feature => disabledFeatures[feature])
  // coc.nvim changes TMPDIR, which prevents gopls from finding its remote daemon.
  const tmpdir = await coc.workspace.nvim.eval('$TMPDIR')
  const serverEnvironment = {
    ...goEnvironment(),
    ...(typeof tmpdir === 'string' && tmpdir ? { TMPDIR: tmpdir } : {}),
  }
  const instance = new coc.LanguageClient('go', 'gopls', {
    command: resolved,
    args,
    options: {
      cwd: coc.workspace.cwd,
      env: serverEnvironment,
    },
  }, {
    documentSelector: ['go', 'gomod', 'gowork'],
    outputChannelName: 'gopls',
    progressOnInitialization: true,
    disabledFeatures: disabled,
    initializationOptions: () => goplsOptions(),
    middleware: combineMiddleware(
      saveSyncMiddleware(getClient),
      vulncheckMiddleware(resolved, getClient),
      workspaceConfigurationMiddleware(goplsOptions),
    ),
  })
  applyTrace(instance)
  return instance
}

function applyTrace(instance: LanguageClient | undefined = client): void {
  if (instance) instance.trace = coc.Trace.fromString(configValue('trace.server', 'off'))
}

export async function startLanguageClient(context: ExtensionContext): Promise<void> {
  if (!configValue('useLanguageServer', true)) return
  let instance = await makeLanguageClient()
  if (!instance && configValue('autoInstallGopls', false)) {
    if (await coc.window.showPrompt('gopls is missing. Install it now?')) {
      if (await installTool('gopls')) instance = await makeLanguageClient()
    }
  }
  if (!instance) {
    coc.window.showWarningMessage(
      'gopls was not found. Run :CocCommand go.gopls.install or set go.alternateTools.gopls.',
    )
    return
  }
  client = instance
  clientRegistration = coc.services.registerLanguageClient(instance)
  context.subscriptions.push(clientRegistration)
}

async function teardownClient(): Promise<void> {
  clientRegistration?.dispose()
  clientRegistration = undefined
  const current = client
  client = undefined
  if (current?.needsStop()) await current.stop().catch(() => undefined)
}

export async function replaceLanguageClient(context: ExtensionContext): Promise<void> {
  await teardownClient()
  await startLanguageClient(context)
}

export async function stopLanguageClient(): Promise<void> {
  await teardownClient()
}
