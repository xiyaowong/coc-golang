const testFunctionPattern
  = /^\s*func\s+(Test(?:[A-Z]\w*)?|Benchmark(?:[A-Z]\w*)?|Example(?:[A-Z]\w*|_[a-z]\w*)?)\s*\(/
const functionDeclarationPattern = /^\s*func\s+(?:\([^)]*\)\s*)?([A-Za-z_]\w*)\s*\(/

export function escapeRegExp(name: string): string {
  return name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function functionLineAtCursor(lines: string[] | string): string | undefined {
  const currentLines = Array.isArray(lines) ? lines : String(lines || '').split('\n')
  for (let index = currentLines.length - 1; index >= 0; index--) {
    if (functionDeclarationPattern.test(currentLines[index])) return currentLines[index]
  }
  return undefined
}

export function functionNameAtCursor(lines: string[] | string): string | undefined {
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

export function testArgumentsForFile(lines: string[], benchmarks = false): string[] | undefined {
  const names = lines.flatMap((line) => {
    const name = testFunctionPattern.exec(line)?.[1]
    return name && name.startsWith('Benchmark') === benchmarks ? [escapeRegExp(name)] : []
  })
  if (!names.length) return undefined

  const pattern = `^(${names.join('|')})$`
  return benchmarks ? ['-run', '^$', '-bench', pattern] : ['-run', pattern]
}

export function testArgumentsAtCursor(lines: string[] | string): string[] | undefined {
  const line = functionLineAtCursor(lines)
  return line ? testArgumentsForLine(line) : undefined
}

export function testNameAtCursor(lines: string[] | string): string | undefined {
  const line = functionLineAtCursor(lines)
  const testName = line && testFunctionPattern.exec(line)?.[1]
  return testName?.startsWith('Test') ? testName : undefined
}
