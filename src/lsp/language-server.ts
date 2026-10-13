import type { Disposable, LanguageClient } from 'coc.nvim'
import type { Ctx } from '../ctx'
import { LanguageClient as CocLanguageClient, services, Trace, window, workspace } from 'coc.nvim'
import { DisposableStore } from '../disposable'
import { goplsConfiguration } from '../go/config-utils'
import { combineMiddleware, saveSyncMiddleware, workspaceConfigurationMiddleware } from './middleware'
import { vulncheckMiddleware } from './vulncheck'

export class LanguageServer extends DisposableStore {
  private client: LanguageClient | undefined
  private registration: Disposable | undefined

  constructor(private readonly ctx: Ctx) {
    super()
    this.track(this.ctx.config.onDidChange((change) => {
      if (!change.languageServer) return
      void this.replace()
    }))
  }

  getClient(): LanguageClient | undefined {
    return this.client
  }

  private options(): Record<string, unknown> {
    const config = this.ctx.config
    const go = workspace.getConfiguration('go')
    const hints = go.get<Record<string, boolean>>('inlayHints', {})
    return goplsConfiguration(workspace.getConfiguration().get<Record<string, unknown>>('gopls', {}), {
      buildFlags: config.get<string[]>('buildFlags', []),
      buildTags: config.get('buildTags', ''),
      inlayHints: Object.fromEntries(Object.entries(hints).filter(([, value]) => typeof value === 'boolean')),
      vulncheck: config.get<string>('diagnostic.vulncheck', 'Imports'),
      runTestCodeLens: go.get<{ runtest?: boolean }>('enableCodeLens', {}).runtest !== false,
    })
  }

  async restart(): Promise<void> {
    const current = this.client
    if (!current) return
    if (current.needsStop()) await current.stop()
    current.restart()
  }

  private async make(): Promise<LanguageClient | undefined> {
    const resolved = await this.ctx.tools.executable('gopls')
    if (!resolved) return undefined

    const config = this.ctx.config
    const args = [...config.get<string[]>('languageServerFlags', [])]
    if (config.get('goplsUseDaemon', true) && !args.some(value => value.startsWith('-remote'))) {
      args.push('-remote=auto')
    }
    const disabledFeatures = config.get<Record<string, boolean>>('disable', {})
    const disabled = Object.keys(disabledFeatures).filter(feature => disabledFeatures[feature])
    // coc.nvim changes TMPDIR, which prevents gopls from finding its remote daemon.
    const tmpdir = await workspace.nvim.eval('$TMPDIR')
    const serverEnvironment = {
      ...this.ctx.environment.variables(),
      ...(typeof tmpdir === 'string' && tmpdir ? { TMPDIR: tmpdir } : {}),
    }
    const instance = new CocLanguageClient('go', 'gopls', {
      command: resolved,
      args,
      options: {
        cwd: workspace.cwd,
        env: serverEnvironment,
      },
    }, {
      documentSelector: ['go', 'gomod', 'gowork'],
      outputChannelName: 'gopls',
      progressOnInitialization: true,
      disabledFeatures: disabled,
      initializationOptions: () => this.options(),
      middleware: combineMiddleware(
        saveSyncMiddleware(() => this.getClient()),
        vulncheckMiddleware(this.ctx, resolved),
        workspaceConfigurationMiddleware(() => this.options()),
      ),
    })
    this.applyTrace(instance)
    return instance
  }

  private applyTrace(instance: LanguageClient | undefined = this.client): void {
    if (instance) instance.trace = Trace.fromString(this.ctx.config.get('trace.server', 'off'))
  }

  async start(): Promise<void> {
    if (!this.ctx.config.get('useLanguageServer', true)) return
    let instance = await this.make()
    if (!instance && this.ctx.config.get('autoInstallGopls', false)) {
      if (await window.showPrompt('gopls is missing. Install it now?')) {
        if (await this.ctx.tools.install('gopls')) instance = await this.make()
      }
    }
    if (!instance) {
      window.showWarningMessage(
        'gopls was not found. Run :CocCommand go.gopls.install or set go.alternateTools.gopls.',
      )
      return
    }
    this.client = instance
    this.registration = services.registerLanguageClient(instance)
    this.track(this.registration)
  }

  private async teardown(): Promise<void> {
    this.registration?.dispose()
    this.registration = undefined
    const current = this.client
    this.client = undefined
    if (current?.needsStop()) await current.stop().catch(() => undefined)
  }

  async replace(): Promise<void> {
    await this.teardown()
    await this.start()
  }

  async stop(): Promise<void> {
    await this.teardown()
  }

  override async dispose(): Promise<void> {
    await this.teardown()
    super.dispose()
  }
}
