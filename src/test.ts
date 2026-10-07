import { configValue, goTestEnvironment, goTestFlags } from './config'
import { killTests, runGo } from './process'

interface PreviousTest {
  args: string[]
  cwd: string
}

let previousTest: PreviousTest | undefined

export function getPreviousTest(): PreviousTest | undefined {
  return previousTest
}

export async function runTests(args: string[], cwd: string): Promise<void> {
  previousTest = { args, cwd }
  if (configValue('disableConcurrentTests', false)) killTests()
  await runGo('test', [...goTestFlags(), ...args], {
    cwd,
    environment: goTestEnvironment(),
    testProcess: true,
    revealOutput: true,
  })
}
