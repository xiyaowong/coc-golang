import type { Range as CocRange, Diagnostic, DiagnosticCollection } from 'coc.nvim'
import type { Ctx } from './ctx'
import { readFileSync } from 'node:fs'
import { devNull } from 'node:os'
import { resolve } from 'node:path'
import { Diagnostic as CocDiagnostic, DiagnosticSeverity, languages, Range, window, workspace } from 'coc.nvim'
import { DisposableStore } from './disposable'
import { fileUri } from './editor'
import { toolFailure } from './go/tools'

export type CheckKind = 'build' | 'vet' | 'lint'
export type CheckScope = 'file' | 'package' | 'workspace'

export interface CheckOptions {
  cwd: string
  file?: string
}

interface Problem {
  file: string
  line: number
  column?: number
  message: string
}

const problemPattern = /^((?:[A-Z]:)?[^:]+):(\d+)(?::(\d+))?:(.*)$/i

function parseProblems(output: string, cwd: string): Problem[] {
  const problems: Problem[] = []
  for (const line of output.split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue
    const diagnostic = line.replace(/^vet(?:\.exe)?:\s*/, '')
    const match = problemPattern.exec(diagnostic)
    if (!match) continue
    const message = match[4].trimStart()
    if (!message) continue
    problems.push({
      file: resolve(cwd, match[1]),
      line: Number(match[2]),
      column: match[3] ? Number(match[3]) : undefined,
      message,
    })
  }
  return problems
}

function lintArguments(tool: string, flags: string[], target: string): string[] {
  return tool.startsWith('golangci-lint') ? ['run', ...flags, target] : [...flags, target]
}

function linesOf(uri: string, file: string): string[] | undefined {
  const document = workspace.getDocument(uri)
  if (document) return document.getLines()
  try {
    return readFileSync(file, 'utf8').split(/\r?\n/)
  } catch {
    return undefined
  }
}

function diagnosticRange(lines: string[] | undefined, problem: Problem): CocRange {
  const line = problem.line - 1
  const text = lines?.[line]
  if (text === undefined) {
    return Range.create(line, (problem.column ?? 1) - 1, line, problem.column ?? 1)
  }
  const end = text.trimEnd().length
  if (end === 0) return Range.create(line, 0, line, text.length)
  const reported = problem.column !== undefined ? problem.column - 1 : undefined
  const start = reported === undefined || reported >= end ? text.search(/\S/) : reported
  return Range.create(line, start, line, end)
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
    const lines = new Map<string, string[] | undefined>()
    for (const problem of problems) {
      const uri = fileUri(problem.file)
      if (!lines.has(problem.file)) lines.set(problem.file, linesOf(uri, problem.file))
      const list = diagnostics.get(uri) ?? []
      list.push(CocDiagnostic.create(diagnosticRange(lines.get(problem.file), problem), problem.message, severity, undefined, tool ?? `go ${kind}`))
      diagnostics.set(uri, list)
    }
    collection.clear()
    collection.set([...diagnostics.entries()])
  }
}
