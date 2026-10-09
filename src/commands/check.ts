import type { ProcessResult } from '../process'
import { devNull } from 'node:os'
import * as coc from 'coc.nvim'
import { configValue, goBuildFlags } from '../config'
import { lintArguments, parseProblems } from '../go-check-utils'
import { runGo, showCommandOutput } from '../process'
import { runTool, toolFailure } from '../tools'
import { fileUri } from './editor'

export type CheckKind = 'build' | 'vet' | 'lint'
export type CheckScope = 'file' | 'package' | 'workspace'

export interface CheckOptions {
  cwd: string
  file?: string
}

const checkCollections = new Map<string, coc.DiagnosticCollection>()

function checkCollection(kind: CheckKind, tool?: string): coc.DiagnosticCollection {
  const name = kind === 'lint' ? `go-lint-${tool}` : `go-${kind}`
  let collection = checkCollections.get(name)
  if (!collection) {
    collection = coc.languages.createDiagnosticCollection(name)
    checkCollections.set(name, collection)
  }
  return collection
}

function lintTool(): string {
  return configValue('lintTool', '') || 'staticcheck'
}

export async function runCheck(
  kind: CheckKind,
  scope: CheckScope,
  options: CheckOptions,
): Promise<void> {
  const { cwd, file } = options
  const target = scope === 'workspace' ? './...' : scope === 'file' && file ? file : '.'
  let result: ProcessResult | undefined
  let tool: string | undefined
  if (kind === 'lint') {
    tool = lintTool()
    const args = lintArguments(tool, configValue<string[]>('lintFlags', []), target)
    showCommandOutput(`${tool} ${args.join(' ')}`)
    result = await runTool(tool, args, { cwd, quiet: true })
  } else if (kind === 'vet') {
    result = await runGo('vet', [...goBuildFlags(), ...configValue<string[]>('vetFlags', []), target], { cwd })
  } else {
    const flags = [...goBuildFlags()]
    if (configValue('installDependenciesWhenBuilding', false)) flags.unshift('-i')
    const output = scope === 'workspace' ? [] : ['-o', devNull]
    result = await runGo('build', [...flags, ...output, target], { cwd })
  }
  if (!result) return

  const collection = checkCollection(kind, tool)
  const problems = parseProblems(result.output, cwd)
  if (kind === 'lint' && result.code !== 0 && !problems.length) {
    await coc.window.showNotification({
      kind: 'error',
      title: `${tool} failed`,
      content: toolFailure(`Exit code ${result.code}`, result),
    })
  }
  const severity = kind === 'build' ? coc.DiagnosticSeverity.Error : coc.DiagnosticSeverity.Warning
  const diagnostics = new Map<string, coc.Diagnostic[]>()
  for (const problem of problems) {
    const uri = fileUri(problem.file)
    const range = coc.Range.create(problem.line - 1, problem.column - 1, problem.line - 1, problem.column - 1)
    const list = diagnostics.get(uri) ?? []
    list.push(coc.Diagnostic.create(range, problem.message, severity, undefined, tool ?? `go ${kind}`))
    diagnostics.set(uri, list)
  }
  collection.clear()
  collection.set([...diagnostics.entries()])
}
