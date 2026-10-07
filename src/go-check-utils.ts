import { resolve } from 'node:path'

export type Problem = {
  file: string
  line: number
  column: number
  message: string
}

const problemPattern = /^(?:vet:\s*)?((?:[A-Za-z]:)?[^:]+?):(\d+)(?::(\d+))?:\s*(.+)$/

export function parseProblems(output: string, cwd: string): Problem[] {
  const problems: Problem[] = []
  for (const line of output.split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue
    const match = problemPattern.exec(line)
    if (!match) continue
    problems.push({
      file: resolve(cwd, match[1]),
      line: Number(match[2]),
      column: match[3] ? Number(match[3]) : 1,
      message: match[4]
    })
  }
  return problems
}

export type LintTool = 'staticcheck' | 'golint' | 'golangci-lint' | 'golangci-lint-v2' | 'revive'

export function lintArguments(tool: string, flags: string[], target: string): string[] {
  return tool.startsWith('golangci-lint') ? ['run', ...flags, target] : [...flags, target]
}
