import type { Range as CocRange, Diagnostic, DiagnosticCollection } from 'coc.nvim'
import type { Ctx } from './ctx'
import { readFileSync } from 'node:fs'
import { devNull } from 'node:os'
import { resolve } from 'node:path'
import { Diagnostic as CocDiagnostic, diagnosticManager, DiagnosticSeverity, languages, Range, window, workspace } from 'coc.nvim'
import { DisposableStore } from './disposable'
import { fileUri } from './editor'
import { toolFailure } from './go/tools'
import { taskLabels } from './status'

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
  endLine?: number
  endColumn?: number
  message: string
  code?: string
  codeDescription?: string
  severity?: DiagnosticSeverity
}

const problemPattern = /^((?:[A-Z]:)?[^:]+):(\d+)(?::(\d+))?:(.*)$/i
const positionPattern = /^(.+):(\d+):(\d+)$/

function parsePosition(position: string): { file: string, line: number, column: number } | undefined {
  const match = positionPattern.exec(position)
  if (!match) return undefined
  const line = Number(match[2])
  const column = Number(match[3])
  if (line < 1 || column < 1) return undefined
  return { file: match[1], line, column }
}

// `go vet -json` nests findings by package path, then by analyzer.
function parseVetJson(output: string): Problem[] | undefined {
  let packages: unknown
  try {
    packages = JSON.parse(output)
  } catch {
    return undefined
  }
  if (!packages || typeof packages !== 'object') return undefined
  const problems: Problem[] = []
  for (const analyzers of Object.values(packages)) {
    if (!analyzers || typeof analyzers !== 'object') continue
    for (const [analyzer, findings] of Object.entries(analyzers)) {
      if (!Array.isArray(findings)) continue
      for (const finding of findings) {
        const posn = parsePosition(finding?.posn ?? '')
        const end = parsePosition(finding?.end ?? '')
        if (!posn || !finding?.message) continue
        problems.push({
          file: posn.file,
          line: posn.line,
          column: posn.column,
          endLine: end?.line,
          endColumn: end?.column,
          message: finding.message,
          code: analyzer,
        })
      }
    }
  }
  return problems
}

interface StaticcheckFinding {
  code?: string
  severity?: string
  location?: { file?: string, line?: number, column?: number }
  end?: { line?: number, column?: number }
  message?: string
}

function staticcheckSeverity(severity: string | undefined): DiagnosticSeverity | undefined {
  if (severity === 'error') return DiagnosticSeverity.Error
  if (severity === 'warning') return DiagnosticSeverity.Warning
  return undefined
}

// staticcheck and golangci-lint both write one JSON object per line.
function parseLineJson(output: string): Problem[] | undefined {
  const problems: Problem[] = []
  let found = false
  for (const line of output.split(/\r?\n/)) {
    if (!line.startsWith('{')) continue
    let finding: StaticcheckFinding
    try {
      finding = JSON.parse(line)
    } catch {
      continue
    }
    found = true
    const line0 = finding.location?.line
    const column = finding.location?.column
    if (!finding.location?.file || !line0 || !column || !finding.message) continue
    problems.push({
      file: finding.location.file,
      line: line0,
      column,
      endLine: finding.end?.line,
      endColumn: finding.end?.column,
      message: finding.message,
      code: finding.code,
      ...(finding.code ? { codeDescription: `https://staticcheck.dev/docs/checks/#${finding.code}` } : {}),
      severity: staticcheckSeverity(finding.severity),
    })
  }
  return found ? problems : undefined
}

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

// The flags that make a lint tool emit JSON, or undefined for the tools that
// have no machine-readable output.
function lintJsonArguments(tool: string): string[] | undefined {
  if (tool === 'golangci-lint-v2') return ['--output.json.path', 'stdout']
  if (tool === 'golangci-lint' || tool === 'staticcheck') return ['-f', 'json']
  return undefined
}

// Diagnostic sources in the order vscode-go resolves a conflict at one position.
const sourcePriority = ['go build', 'go vet']

function sourceRank(source: string | undefined): number {
  const index = source ? sourcePriority.indexOf(source) : -1
  return index === -1 ? sourcePriority.length + 1 : index + 1
}

function positionKey(range: CocRange): string {
  return `${range.start.line}:${range.start.character}`
}

function reportedAt(
  collections: Record<string, Diagnostic[]>,
  skip: string,
  serverCollection: string | undefined,
): Map<string, number> {
  const best = new Map<string, number>()
  for (const [collection, diagnostics] of Object.entries(collections)) {
    if (collection === skip) continue
    for (const diagnostic of diagnostics) {
      const key = positionKey(diagnostic.range)
      const rank = collection === serverCollection ? 0 : sourceRank(diagnostic.source)
      const current = best.get(key)
      best.set(key, current === undefined ? rank : Math.min(current, rank))
    }
  }
  return best
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
  const start = (problem.column ?? 1) - 1
  if (problem.endLine !== undefined && problem.endColumn !== undefined) {
    const end = Range.create(
      line,
      start,
      problem.endLine - 1,
      problem.endColumn - 1,
    )
    if (end.start.line !== end.end.line || end.start.character !== end.end.character) return end
  }
  const text = lines?.[line]
  if (text === undefined) return Range.create(line, start, line, start + 1)
  const end = text.trimEnd().length
  if (end === 0) return Range.create(line, 0, line, text.length)
  const from = start >= end ? text.search(/\S/) : start
  return Range.create(line, from, line, end)
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
    await this.ctx.statusBar.during(taskLabels[kind], this.check(kind, scope, options))
  }

  private async check(kind: CheckKind, scope: CheckScope, options: CheckOptions): Promise<void> {
    const { cwd, file } = options
    const config = this.ctx.config
    const target = scope === 'workspace' ? './...' : scope === 'file' && file ? file : '.'
    let result
    let tool: string | undefined
    let takeJson: boolean | undefined
    if (kind === 'lint') {
      tool = this.lintTool()
      const json = lintJsonArguments(tool)
      const args = lintArguments(tool, [...json ?? [], ...config.get<string[]>('lintFlags', [])], target)
      this.ctx.output.header(`${tool} ${args.join(' ')}`)
      result = await this.ctx.tools.run(tool, args, { cwd, quiet: true })
      takeJson = !!json
    } else if (kind === 'vet') {
      result = await this.ctx.process.go('vet', ['-json', ...config.buildFlags(), ...config.get<string[]>('vetFlags', []), target], { cwd, quiet: true })
    } else {
      const flags = [...config.buildFlags()]
      if (config.get('installDependenciesWhenBuilding', false)) flags.unshift('-i')
      const output = scope === 'workspace' ? [] : ['-o', devNull]
      result = await this.ctx.process.go('build', [...flags, ...output, target], { cwd })
    }
    if (!result) return

    const name = kind === 'lint' ? `go-lint-${tool}` : `go-${kind}`
    const collection = this.collection(name)
    let problems: Problem[] | undefined
    if (kind === 'vet') {
      problems = parseVetJson(result.stdout)
      if (!problems) this.ctx.output.append(result.output)
    } else if (kind === 'lint' && takeJson) {
      problems = parseLineJson(result.stdout)
    }
    problems ??= parseProblems(result.output, cwd)
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
    const reported = new Map<string, Map<string, number>>()
    const serverCollection = this.ctx.languageServer.getClient()?.id
    const source = tool ?? `go ${kind}`
    const rank = sourceRank(source)
    for (const problem of problems) {
      const uri = fileUri(problem.file)
      if (!lines.has(problem.file)) lines.set(problem.file, linesOf(uri, problem.file))
      const range = diagnosticRange(lines.get(problem.file), problem)
      const key = positionKey(range)
      if (!reported.has(uri)) reported.set(uri, reportedAt(diagnosticManager.getDiagnostics(uri), name, serverCollection))
      const existing = reported.get(uri)!
      if ((existing.get(key) ?? Infinity) < rank) continue
      existing.set(key, Math.min(existing.get(key) ?? Infinity, rank))
      const list = diagnostics.get(uri) ?? []
      const diagnostic = CocDiagnostic.create(
        range,
        problem.message,
        problem.severity ?? severity,
        problem.code,
        source,
      )
      if (problem.codeDescription) diagnostic.codeDescription = { href: problem.codeDescription }
      list.push(diagnostic)
      diagnostics.set(uri, list)
    }
    collection.clear()
    collection.set([...diagnostics.entries()])
  }
}
