const testFunctionPattern
  = /^\s*func\s+(Test(?:[A-Z]\w*)?|Benchmark(?:[A-Z]\w*)?|Example(?:[A-Z]\w*|_[a-z]\w*)?)\s*\(/
const functionDeclarationPattern = /^\s*func\s+(?:\([^)]*\)\s*)?([A-Za-z_]\w*)\s*\(/

export interface TestSelectionOptions {
  benchmarks?: boolean
}

export interface TestFunction {
  name: string
  line: number
}

export function escapeRegExp(name: string): string {
  return name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Names the `go test -list` command prints for tests, examples, and benchmarks.
export function parseTestList(stdout: string): string[] {
  return stdout.split(/\r?\n/).filter(name =>
    /^(?:Test[A-Z0-9]\w*|Benchmark[A-Z0-9]\w*|Example(?:[A-Z]\w*|_[a-z]\w*)?)$/.test(name),
  )
}

// Test functions declared in a file, with their 1-based line numbers. Only the
// first function on a line is considered, matching the go test naming rules.
export function testFunctions(lines: string[]): TestFunction[] {
  const found: TestFunction[] = []
  lines.forEach((line, index) => {
    const name = testFunctionPattern.exec(line)?.[1]
    if (name) found.push({ name, line: index + 1 })
  })
  return found
}

// Per-test results printed by `go test -v`. The indented log lines (and panic
// traces) written while a test runs are attached to that test, so a failed test
// can report the output that made it fail. Subtests appear with their
// slash-separated name.
export type TestOutcome = 'passed' | 'failed' | 'skipped'

export interface TestResult {
  name: string
  outcome: TestOutcome
  output: string[]
}

export function parseTestResults(output: string): TestResult[] {
  const logs = new Map<string, string[]>()
  const results = new Map<string, TestResult>()
  let current: string | undefined
  for (const line of output.split(/\r?\n/)) {
    const run = /^===\s+(?:RUN|PAUSE|CONT)\s+(\S+)/.exec(line)
    if (run) {
      current = run[1]
      if (!logs.has(current)) logs.set(current, [])
      continue
    }
    const result = /^\s*---\s+(PASS|FAIL|SKIP):\s+(\S+)/.exec(line)
    if (result) {
      const name = result[2]
      const outcome: TestOutcome = result[1] === 'PASS' ? 'passed' : result[1] === 'FAIL' ? 'failed' : 'skipped'
      results.set(name, { name, outcome, output: logs.get(name) ?? [] })
      continue
    }
    // Anything else while a test runs is its output; skip the terminal summary.
    if (current && !/^(?:FAIL|PASS|ok)\b/.test(line.trim())) logs.get(current)!.push(line.trim())
  }
  return [...results.values()]
}

export function functionLineAtCursor(lines: string[]): string | undefined {
  for (let index = lines.length - 1; index >= 0; index--) {
    if (functionDeclarationPattern.test(lines[index])) return lines[index]
  }
  return undefined
}

export function functionNameAtCursor(lines: string[]): string | undefined {
  const line = functionLineAtCursor(lines)
  return line ? functionDeclarationPattern.exec(line)?.[1] : undefined
}

export function testArgumentsForLine(line: string): string[] | undefined {
  const name = testFunctionPattern.exec(line)?.[1]
  if (!name) return undefined

  const escaped = escapeRegExp(name)
  return name.startsWith('Benchmark')
    ? ['-run', '^$', '-bench', `^${escaped}$`]
    : ['-run', `^${escaped}$`]
}

export function testArgumentsForFile(lines: string[], options: TestSelectionOptions = {}): string[] | undefined {
  const { benchmarks = false } = options
  const names = lines.flatMap((line) => {
    const name = testFunctionPattern.exec(line)?.[1]
    return name && name.startsWith('Benchmark') === benchmarks ? [escapeRegExp(name)] : []
  })
  if (!names.length) return undefined

  const pattern = `^(${names.join('|')})$`
  return benchmarks ? ['-run', '^$', '-bench', pattern] : ['-run', pattern]
}

export function testArgumentsAtCursor(lines: string[]): string[] | undefined {
  const line = functionLineAtCursor(lines)
  return line ? testArgumentsForLine(line) : undefined
}

export function testNameAtCursor(lines: string[]): string | undefined {
  const line = functionLineAtCursor(lines)
  const testName = line && testFunctionPattern.exec(line)?.[1]
  return testName?.startsWith('Test') ? testName : undefined
}
