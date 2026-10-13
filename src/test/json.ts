// Parses the newline-delimited JSON that `go test -json` writes, so callers work
// with structured results instead of scraping terminal text.

export type TestOutcome = 'passed' | 'failed' | 'skipped'

export interface TestResult {
  package: string
  name: string
  outcome: TestOutcome
  elapsed: number
  output: string[]
}

export interface PackageResult {
  package: string
  outcome: TestOutcome
  buildError: string[]
}

interface Event {
  Action?: string
  Package?: string
  ImportPath?: string
  Test?: string
  Output?: string
  OutputType?: string
  Elapsed?: number
}

function outcomeOf(action: string): TestOutcome {
  return action === 'pass' ? 'passed' : action === 'fail' ? 'failed' : 'skipped'
}

// `go test` prints build diagnostics without a Package, using ImportPath instead.
function packageOf(event: Event): string | undefined {
  return event.Package ?? event.ImportPath
}

function parseEvent(line: string): Event | undefined {
  const trimmed = line.trim()
  if (!trimmed.startsWith('{')) return undefined
  try {
    return JSON.parse(trimmed) as Event
  } catch {
    return undefined
  }
}

// Accumulates `go test -json` events one line at a time, so a caller can update
// results as they are reported instead of waiting for the run to finish.
export class GoTestJsonParser {
  private readonly tests = new Map<string, TestResult>()
  private readonly packages = new Map<string, PackageResult>()
  private readonly buildErrors = new Map<string, string[]>()
  private readonly listeners: Array<() => void> = []

  // Called after each line that changed a result, so a view can refresh.
  onChange(listener: () => void): void {
    this.listeners.push(listener)
  }

  push(line: string): void {
    const event = parseEvent(line)
    if (!event) return
    const pkg = packageOf(event)
    if (!pkg) return
    switch (event.Action) {
      case 'build-output':
        this.buildErrors.set(pkg, [...this.buildErrors.get(pkg) ?? [], (event.Output ?? '').replace(/\r?\n$/, '')])
        return
      case 'build-fail':
        this.packages.set(pkg, { package: pkg, outcome: 'failed', buildError: this.buildErrors.get(pkg) ?? [] })
        break
      case 'output': {
        if (!event.Test || event.OutputType === 'frame') return
        const text = (event.Output ?? '').replace(/\r?\n$/, '')
        if (text) this.ensure(pkg, event.Test).output.push(text)
        return
      }
      case 'pass':
      case 'fail':
      case 'skip':
        if (event.Test) {
          const result = this.ensure(pkg, event.Test)
          result.outcome = outcomeOf(event.Action)
          result.elapsed = event.Elapsed ?? 0
        } else {
          this.packages.set(pkg, { package: pkg, outcome: outcomeOf(event.Action), buildError: this.buildErrors.get(pkg) ?? [] })
        }
        break
      default:
        return
    }
    for (const listener of this.listeners) listener()
  }

  getTests(): TestResult[] {
    return [...this.tests.values()]
  }

  getPackages(): PackageResult[] {
    return [...this.packages.values()]
  }

  private ensure(pkg: string, name: string): TestResult {
    const key = `${pkg}\u0000${name}`
    let result = this.tests.get(key)
    if (!result) {
      result = { package: pkg, name, outcome: 'passed', elapsed: 0, output: [] }
      this.tests.set(key, result)
    }
    return result
  }
}

// Test names printed by `go test -json -list`, grouped by package import path.
export function parseGoTestList(text: string, isName: (name: string) => boolean): Map<string, string[]> {
  const names = new Map<string, string[]>()
  for (const line of text.split(/\r?\n/)) {
    const event = parseEvent(line)
    if (event?.Action !== 'output' || !event.Package || !event.Output) continue
    const name = event.Output.trim()
    if (!isName(name)) continue
    names.set(event.Package, [...names.get(event.Package) ?? [], name])
  }
  return names
}
