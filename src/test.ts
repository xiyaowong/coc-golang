import { goTestEnvironment, goTestFlags } from './config'
import { runGoInTerminal } from './process'

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
  await runGoInTerminal('test', [...goTestFlags(), ...args], {
    cwd,
    environment: goTestEnvironment(),
  })
}
