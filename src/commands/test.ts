import type { ExtensionContext } from 'coc.nvim'
import { readFileSync } from 'node:fs'
import * as coc from 'coc.nvim'
import { configValue, goTestFlags } from '../config'
import { parseEnvFile } from '../go-config-utils'
import { escapeRegExp, testArgumentsAtCursor, testArgumentsForFile, testNameAtCursor } from '../go-test-utils'
import { runGoInTerminal, runGoProcess, showOutput, terminal } from '../process'
import {
  activeDirectory,
  activeGoFile,
  counterpartGoFile,
  currentBufferLines,
  fileUri,
  linesToCursor,
  wordAtCursor,
  workspaceDirectories,
} from './editor'
import { registerCommand } from './index'

interface PreviousTest {
  args: string[]
  cwd: string
}

let previousTest: PreviousTest | undefined

const benchmarkFlags = (): string[] => configValue<string[]>('benchmarkFlags', [])

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

async function listAndRunTest(): Promise<void> {
  const directory = await activeDirectory()
  try {
    const result = await runGoProcess('test', ['-list', '.'], { cwd: directory })
    const names = result.stdout.split(/\r?\n/).filter(name =>
      /^(?:Test[A-Z0-9]\w*|Benchmark[A-Z0-9]\w*|Example(?:[A-Z]\w*|_[a-z]\w*)?)$/.test(name),
    )
    if (result.code !== 0) {
      coc.window.showErrorMessage(`go test -list exited with code ${result.code}`)
      return
    }
    if (!names.length) {
      coc.window.showWarningMessage('No Go tests, examples, or benchmarks found in this package.')
      return
    }
    const name = await coc.window.showQuickPick(names, { title: 'Select a Go test or benchmark', placeHolder: 'Type to filter' })
    if (!name) return
    const escaped = escapeRegExp(name)
    const args = name.startsWith('Benchmark')
      ? ['-run', '^$', '-bench', `^${escaped}$`, ...benchmarkFlags()]
      : ['-run', `^${escaped}$`]
    await runTests(args, directory)
  } catch (error) {
    coc.window.showErrorMessage(`Failed to list Go tests: ${String(error)}`)
  }
}

async function runSelected(args: string[] | undefined, warning: string): Promise<void> {
  if (!args) {
    coc.window.showWarningMessage(warning)
    return
  }
  await runTests(args, await activeDirectory())
}

export function registerTestCommands(context: ExtensionContext): void {
  registerCommand(context, 'go.test.package', async () => runTests([], await activeDirectory()))
  registerCommand(context, 'go.test.explorer', listAndRunTest)
  registerCommand(context, 'go.test.workspace', async () => {
    for (const directory of workspaceDirectories()) await runTests(['./...'], directory)
  })
  registerCommand(context, 'go.test.file', async () =>
    runSelected(testArgumentsForFile(await currentBufferLines()), 'No Go tests or examples found in the current file.'))
  registerCommand(context, 'go.test.cursor', async () =>
    runSelected(testArgumentsAtCursor(await linesToCursor()), 'No Go test, benchmark, or example found at the cursor.'))
  registerCommand(context, 'go.test.cursorOrPrevious', async () => {
    const args = testArgumentsAtCursor(await linesToCursor())
    if (args) await runTests(args, await activeDirectory())
    else await coc.commands.executeCommand('go.test.previous')
  })
  registerCommand(context, 'go.subtest.cursor', async () => {
    const testName = testNameAtCursor(await linesToCursor())
    const subtestName = await wordAtCursor()
    if (!testName || !subtestName) {
      coc.window.showWarningMessage('Place the cursor on a subtest inside a Go test function.')
      return
    }
    await runTests(['-run', `^${escapeRegExp(testName)}$/${escapeRegExp(subtestName)}$`], await activeDirectory())
  })
  registerCommand(context, 'go.test.previous', async () => {
    if (!previousTest) {
      coc.window.showWarningMessage('No previous Go test command.')
      return
    }
    await runTests(previousTest.args, previousTest.cwd)
  })
  registerCommand(context, 'go.test.coverage', async () => runTests(['-cover'], await activeDirectory()))
  registerCommand(context, 'go.toggle.test.file', async () => {
    const file = await activeGoFile()
    const target = file ? counterpartGoFile(file) : undefined
    if (!target) return
    await coc.workspace.openResource(fileUri(target))
  })
  registerCommand(context, 'go.test.cancel', () => terminal()?.sendText('\x03', false))
  registerCommand(context, 'go.test.showOutput', async () => {
    const current = terminal()
    if (!current) {
      coc.window.showWarningMessage('No Go terminal. Run a Go command first.')
      return
    }
    await current.show(true)
  })

  registerCommand(context, 'go.benchmark.package', async () =>
    runTests(['-run', '^$', '-bench', '.', ...benchmarkFlags()], await activeDirectory()))
  registerCommand(context, 'go.benchmark.cursor', async () => {
    const args = testArgumentsAtCursor(await linesToCursor())
    await runSelected(args?.includes('-bench') ? [...args, ...benchmarkFlags()] : undefined, 'No Go benchmark found at the cursor.')
  })
  registerCommand(context, 'go.benchmark.file', async () => {
    const args = testArgumentsForFile(await currentBufferLines(), { benchmarks: true })
    await runSelected(args && [...args, ...benchmarkFlags()], 'No Go benchmarks found in the current file.')
  })
}
