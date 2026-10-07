import { configValue, goTestEnvironment, goTestFlags } from './config'
import { killTests, runGo } from './process'

let previousTest: { args: string[], cwd: string } | undefined

export function getPreviousTest(): { args: string[], cwd: string } | undefined {
  return previousTest
}

export async function runTests(args: string[], cwd: string): Promise<void> {
  previousTest = { args, cwd }
  if (configValue('disableConcurrentTests', false)) killTests()
  await runGo('test', [...goTestFlags(), ...args], cwd, true, goTestEnvironment())
}
