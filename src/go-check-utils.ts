import { resolve } from 'node:path'

export interface Problem {
  file: string
  line: number
  column: number
  message: string
}

const problemPattern = /^((?:[A-Z]:)?[^:]+):(\d+)(?::(\d+))?:(.*)$/i

export function parseProblems(output: string, cwd: string): Problem[] {
  const problems: Problem[] = []
  for (const line of output.split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue
    const diagnostic = line.startsWith('vet:') ? line.slice(4).trimStart() : line
    const match = problemPattern.exec(diagnostic)
    if (!match) continue
    const message = match[4].trimStart()
    if (!message) continue
    problems.push({
      file: resolve(cwd, match[1]),
      line: Number(match[2]),
      column: match[3] ? Number(match[3]) : 1,
      message,
    })
  }
  return problems
}

export type LintTool = 'staticcheck' | 'golint' | 'golangci-lint' | 'golangci-lint-v2' | 'revive'

export function lintArguments(tool: string, flags: string[], target: string): string[] {
  return tool.startsWith('golangci-lint') ? ['run', ...flags, target] : [...flags, target]
}
