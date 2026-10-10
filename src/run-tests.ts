import { readFileSync } from 'node:fs'
import * as coc from 'coc.nvim'
import { configValue, goTestFlags } from './config'
import { parseEnvFile } from './go-config-utils'
import { showOutput } from './output'
import { runGoInTerminal } from './terminal'

export interface PreviousTest {
  args: string[]
  cwd: string
}

let previousTest: PreviousTest | undefined

export function getPreviousTest(): PreviousTest | undefined {
  return previousTest
}

// Runs `go test` in the terminal and remembers the invocation so
// go.test.previous can repeat it. Shared by the test commands and the
// build-on-save handler.
export async function runTests(args: string[], cwd: string): Promise<void> {
  previousTest = { args, cwd }
  const envFile = configValue('testEnvFile', '')
  let variables: Record<string, string> = {}
  if (envFile) {
    try {
      variables = parseEnvFile(readFileSync(envFile, 'utf8'))
    } catch (error) {
      coc.window.showWarningMessage(`Unable to read go.testEnvFile ${envFile}: ${String(error)}`)
    }
  }
  const environment = { ...variables, ...configValue<Record<string, string>>('testEnvVars', {}) }
  await runGoInTerminal('test', [...goTestFlags(), ...args], { cwd, environment })
  showOutput()
}
