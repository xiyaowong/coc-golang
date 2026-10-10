const testFunctionPattern
  = /^\s*func\s+(Test(?:[A-Z]\w*)?|Benchmark(?:[A-Z]\w*)?|Example(?:[A-Z]\w*|_[a-z]\w*)?|Fuzz(?:[A-Z]\w*)?)(?:\[[^\]]*\])?\s*\(/
const functionDeclarationPattern = /^\s*func\s+(?:\([^)]*\)\s*)?([A-Za-z_]\w*)\s*\(/

export interface TestSelectionOptions {
  benchmarks?: boolean
}

export interface TestFunction {
  name: string
  line: number
}

const testNamePattern = /^(?:Test[A-Z0-9]\w*|Benchmark[A-Z0-9]\w*|Example(?:[A-Z]\w*|_[a-z]\w*)?|Fuzz[A-Z]\w*)$/

export function isTestName(name: string): boolean {
  return testNamePattern.test(name)
}

export function escapeRegExp(name: string): string {
  return name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function testFunctions(lines: string[]): TestFunction[] {
  const found: TestFunction[] = []
  lines.forEach((line, index) => {
    const name = testFunctionPattern.exec(line)?.[1]
    if (name) found.push({ name, line: index + 1 })
  })
  return found
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
