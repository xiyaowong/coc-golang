import { readFileSync } from 'node:fs'
import * as coc from 'coc.nvim'
import { configValue, goTestFlags } from './config'
import { parseEnvFile } from './go-config-utils'
import { showOutput } from './output'
import { runGoProcess } from './process'
import { runGoInTerminal } from './terminal'

export interface PreviousTest {
  args: string[]
  cwd: string
}

export interface TestRunResult {
  code: number | null
  output: string
}

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

// Runs `go test` and captures its output, for callers that need to parse
// results (the test explorer) rather than read them in the terminal. Also
// remembers the invocation like runTests.
export async function runTestsCaptured(args: string[], cwd: string): Promise<TestRunResult> {
  previousTest = { args, cwd }
  const effective = [...goTestFlags(), ...args]
  const result = await runGoProcess('test', effective, { cwd, environment: testEnvironment() })
  return { code: result.code, output: result.output }
}
