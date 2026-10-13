import type { Range as CocRange, Diagnostic, DiagnosticCollection } from 'coc.nvim'
import type { Ctx } from '../ctx'
import { devNull } from 'node:os'
import { Diagnostic as CocDiagnostic, DiagnosticSeverity, languages, Range, window } from 'coc.nvim'
import { DisposableStore } from '../disposable'
import { fileUri } from '../editor/editor'
import { toolFailure } from '../go/tools'
import { lintArguments, parseProblems } from './utils'

export type CheckKind = 'build' | 'vet' | 'lint'
export type CheckScope = 'file' | 'package' | 'workspace'

export interface CheckOptions {
  cwd: string
  file?: string
}

// Runs go build, go vet and the configured lint tool, and publishes what they
// report as diagnostics. Each kind has its own diagnostic collection, so one
// tool's results never clear another's.
export class Checker extends DisposableStore {
  // One collection per tool, created on first use so a check never clears what
  // another tool reported.
  private readonly collections = new Map<string, DiagnosticCollection>()

  constructor(private readonly ctx: Ctx) {
    super()
  }

  private collection(name: string): DiagnosticCollection {
    let collection = this.collections.get(name)
    if (!collection) {
      collection = this.track(languages.createDiagnosticCollection(name))
      this.collections.set(name, collection)
    }
    return collection
  }

  private lintTool(): string {
    return this.ctx.config.get('lintTool', '') || 'staticcheck'
  }

  async run(kind: CheckKind, scope: CheckScope, options: CheckOptions): Promise<void> {
    const { cwd, file } = options
    const config = this.ctx.config
    const target = scope === 'workspace' ? './...' : scope === 'file' && file ? file : '.'
    let result
    let tool: string | undefined
    if (kind === 'lint') {
      tool = this.lintTool()
      const args = lintArguments(tool, config.get<string[]>('lintFlags', []), target)
      this.ctx.output.header(`${tool} ${args.join(' ')}`)
      result = await this.ctx.tools.run(tool, args, { cwd, quiet: true })
    } else if (kind === 'vet') {
      result = await this.ctx.process.go('vet', [...config.buildFlags(), ...config.get<string[]>('vetFlags', []), target], { cwd })
    } else {
      const flags = [...config.buildFlags()]
      if (config.get('installDependenciesWhenBuilding', false)) flags.unshift('-i')
      const output = scope === 'workspace' ? [] : ['-o', devNull]
      result = await this.ctx.process.go('build', [...flags, ...output, target], { cwd })
    }
    if (!result) return

    const name = kind === 'lint' ? `go-lint-${tool}` : `go-${kind}`
    const collection = this.collection(name)
    const problems = parseProblems(result.output, cwd)
    if (kind === 'lint' && result.code !== 0 && !problems.length) {
      await window.showNotification({
        kind: 'error',
        title: `${tool} failed`,
        content: toolFailure(`Exit code ${result.code}`, result),
      })
    }
    const severity = kind === 'build' ? DiagnosticSeverity.Error : DiagnosticSeverity.Warning
    const diagnostics = new Map<string, Diagnostic[]>()
    for (const problem of problems) {
      const uri = fileUri(problem.file)
      const range: CocRange = Range.create(problem.line - 1, problem.column - 1, problem.line - 1, problem.column - 1)
      const list = diagnostics.get(uri) ?? []
      list.push(CocDiagnostic.create(range, problem.message, severity, undefined, tool ?? `go ${kind}`))
      diagnostics.set(uri, list)
    }
    collection.clear()
    collection.set([...diagnostics.entries()])
  }
}
