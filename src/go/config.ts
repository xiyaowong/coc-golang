import { Emitter, workspace } from 'coc.nvim'
import { DisposableStore } from '../disposable'
import { buildFlagsWithTags, testFlagsFor } from './config-utils'

const formatSettings = [
  'go.formatTool',
  'go.useLanguageServer',
  'go.alternateTools',
]

const environmentSettings = [
  'go.terminal',
  'go.goroot',
  'go.gopath',
  'go.inferGopath',
  'go.toolsEnvVars',
  'go.alternateTools',
]

const restartSettings = [
  'go.useLanguageServer',
  'go.languageServerFlags',
  'go.goplsUseDaemon',
  'go.disable',
  'go.alternateTools',
  'go.goroot',
  'go.gopath',
  'go.inferGopath',
  'go.toolsGopath',
  'go.toolsEnvVars',
  'go.buildFlags',
  'go.buildTags',
  'go.inlayHints',
  'go.diagnostic.vulncheck',
  'go.enableCodeLens',
  'gopls',
]

export interface ConfigChange {
  format: boolean
  environment: boolean
  languageServer: boolean
}

export class ConfigManager extends DisposableStore {
  private readonly emitter = new Emitter<ConfigChange>()
  readonly onDidChange = this.emitter.event

  constructor() {
    super()
    this.track(this.emitter)
    this.track(workspace.onDidChangeConfiguration((event) => {
      const change: ConfigChange = {
        format: formatSettings.some(name => event.affectsConfiguration(name)),
        environment: environmentSettings.some(name => event.affectsConfiguration(name)),
        languageServer: restartSettings.some(name => event.affectsConfiguration(name)),
      }
      if (change.format || change.environment || change.languageServer) this.emitter.fire(change)
    }))
  }

  get<T>(name: string, fallback: T): T {
    const value = workspace.getConfiguration('go').get<T | null>(name)
    return value ?? fallback
  }

  alternateTool(name: string): string | undefined {
    const value = this.get<Record<string, string>>('alternateTools', {})[name]
    return typeof value === 'string' && value.trim() ? value.trim() : undefined
  }

  goCommand(): string {
    return this.alternateTool('go') ?? 'go'
  }

  buildFlags(): string[] {
    return buildFlagsWithTags(this.get<string[]>('buildFlags', []), this.get('buildTags', ''))
  }

  testFlags(): string[] {
    return testFlagsFor({
      testFlags: this.get<string[] | null>('testFlags', null),
      buildFlags: this.get<string[]>('buildFlags', []),
      testTags: this.get<string | null>('testTags', null),
      buildTags: this.get('buildTags', ''),
      testTimeout: this.get('testTimeout', ''),
    })
  }
}
