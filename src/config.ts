import { readFileSync } from 'node:fs'
import * as coc from 'coc.nvim'
import { buildFlagsWithTags, parseEnvFile, testFlagsFor } from './go-config-utils'

export const restartSettings = [
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

export function configValue<T>(name: string, fallback: T): T {
  const value = coc.workspace.getConfiguration('go').get<T | null>(name)
  return value ?? fallback
}

export function alternateTool(name: string): string | undefined {
  const value = configValue<Record<string, string>>('alternateTools', {})[name]
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

export function goCommand(): string {
  return alternateTool('go') ?? 'go'
}

export function goBuildFlags(): string[] {
  return buildFlagsWithTags(configValue<string[]>('buildFlags', []), configValue('buildTags', ''))
}

export function goTestFlags(): string[] {
  return testFlagsFor({
    testFlags: configValue<string[] | null>('testFlags', null),
    buildFlags: configValue<string[]>('buildFlags', []),
    testTags: configValue<string | null>('testTags', null),
    buildTags: configValue('buildTags', ''),
    testTimeout: configValue('testTimeout', ''),
  })
}

export function goTestEnvironment(): NodeJS.ProcessEnv {
  const environment: Record<string, string> = {}
  const envFile = configValue('testEnvFile', '')
  if (envFile) {
    try {
      Object.assign(environment, parseEnvFile(readFileSync(envFile, 'utf8')))
    } catch (error) {
      coc.window.showWarningMessage(`Unable to read go.testEnvFile ${envFile}: ${String(error)}`)
    }
  }
  return { ...environment, ...configValue<Record<string, string>>('testEnvVars', {}) }
}
