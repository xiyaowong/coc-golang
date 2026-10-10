import { readFileSync } from 'node:fs'
import * as coc from 'coc.nvim'
import { configValue, goTestFlags } from './config'
import { parseEnvFile } from './go-config-utils'
import { showOutput } from './output'
import { captureGo } from './process'
import { runGoInTerminal } from './terminal'

export interface PreviousTest {
  args: string[]
  cwd: string
}

export interface TestRunResult {
  code: number | null
  output: string
}

export interface TestPackage {
  importPath: string
  dir: string
  testFiles: string[]
}

const listFormat = '{{.ImportPath}}\t{{.Dir}}\t{{join .TestGoFiles ","}}\t{{join .XTestGoFiles ","}}'

let previousTest: PreviousTest | undefined

export function getPreviousTest(): PreviousTest | undefined {
  return previousTest
}

function testEnvironment(): NodeJS.ProcessEnv {
  const envFile = configValue('testEnvFile', '')
  let variables: Record<string, string> = {}
  if (envFile) {
    try {
      variables = parseEnvFile(readFileSync(envFile, 'utf8'))
    } catch (error) {
      coc.window.showWarningMessage(`Unable to read go.testEnvFile ${envFile}: ${String(error)}`)
    }
  }
  return { ...variables, ...configValue<Record<string, string>>('testEnvVars', {}) }
}

// Runs `go test` in the terminal and remembers the invocation so
// go.test.previous can repeat it. Shared by the test commands and the
// build-on-save handler.
export async function runTests(args: string[], cwd: string): Promise<void> {
  previousTest = { args, cwd }
  await runGoInTerminal('test', [...goTestFlags(), ...args], { cwd, environment: testEnvironment() })
  showOutput()
}

// Runs `go test -json` and streams its output line by line, for callers that
// parse results (the test explorer) as they are reported.
export async function runTestsCaptured(
  args: string[],
  cwd: string,
  onLine?: (line: string) => void,
): Promise<TestRunResult> {
  previousTest = { args, cwd }
  const result = await captureGo('test', ['-json', ...goTestFlags(), ...args], {
    cwd,
    environment: testEnvironment(),
    onLine,
  })
  return { code: result.code, output: result.output }
}

// The packages under `dir` that have test files, described by `go list` so build
// constraints and the module graph are respected.
export async function listTestPackages(dir: string): Promise<TestPackage[]> {
  const result = await captureGo('list', ['-f', listFormat, './...'], { cwd: dir })
  if (result.code !== 0) return []

  const packages: TestPackage[] = []
  for (const line of result.stdout.split(/\r?\n/)) {
    const [importPath, packageDir, internal, external] = line.split('\t')
    if (!importPath || !packageDir) continue
    const testFiles = [...(internal?.split(',') ?? []), ...(external?.split(',') ?? [])].filter(Boolean)
    if (testFiles.length) packages.push({ importPath, dir: packageDir, testFiles })
  }
  return packages
}
