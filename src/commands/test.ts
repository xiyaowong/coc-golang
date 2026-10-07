import type { ExtensionContext } from 'coc.nvim'
import * as coc from 'coc.nvim'
import { configValue, goCommand } from '../config'
import {
  activeDirectory,
  activeFile,
  counterpartGoFile,
  currentBufferLines,
  fileUri,
  linesToCursor,
  workspaceDirectories,
} from '../editor'
import { goEnvironment } from '../environment'
import { testArgumentsAtCursor, testArgumentsForFile, testNameAtCursor } from '../go-test-utils'
import { killTests, runProcess, showCommandOutput, showOutput } from '../process'
import { getPreviousTest, runTests } from '../test'
import { registerCommand } from './register'

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const benchmarkFlags = (): string[] => configValue<string[]>('benchmarkFlags', [])

async function listAndRunTest(): Promise<void> {
  const directory = await activeDirectory()
  showCommandOutput(`${goCommand()} test -list .`)
  try {
    const result = await runProcess(goCommand(), ['test', '-list', '.'], directory, goEnvironment())
    const names = result.stdout.split(/\r?\n/).filter(name =>
      /^(?:Test[A-Z0-9]\w*|Benchmark[A-Z0-9]\w*|Example(?:[A-Z]\w*|_[a-z]\w*)?)$/.test(name),
    )
    if (result.code !== 0) {
      coc.window.showMessage(`go test -list exited with code ${result.code}`, 'error')
      return
    }
    if (!names.length) {
      coc.window.showMessage('No Go tests, examples, or benchmarks found in this package.', 'warning')
      return
    }
    const selected = await coc.window.showQuickpick(names, 'Select a Go test or benchmark')
    if (selected < 0 || selected >= names.length) return
    const name = names[selected]
    const escaped = escapeRegExp(name)
    const args = name.startsWith('Benchmark')
      ? ['-run', '^$', '-bench', `^${escaped}$`, ...benchmarkFlags()]
      : ['-run', `^${escaped}$`]
    await runTests(args, directory)
  } catch (error) {
    coc.window.showMessage(`Failed to list Go tests: ${String(error)}`, 'error')
  }
}

export function registerTestCommands(context: ExtensionContext): void {
  const cwd = activeDirectory
  registerCommand(context, 'go.test.package', async () => runTests([], await cwd()))
  registerCommand(context, 'go.test.explorer', listAndRunTest)
  registerCommand(context, 'go.test.workspace', async () => {
    for (const directory of workspaceDirectories()) await runTests(['./...'], directory)
  })
  registerCommand(context, 'go.test.file', async () => {
    const args = testArgumentsForFile(await currentBufferLines())
    if (!args) {
      coc.window.showMessage('No Go tests or examples found in the current file.', 'warning')
      return
    }
    await runTests(args, await cwd())
  })
  registerCommand(context, 'go.test.cursor', async () => {
    const args = testArgumentsAtCursor(await linesToCursor())
    if (!args) {
      coc.window.showMessage('No Go test, benchmark, or example found at the cursor.', 'warning')
      return
    }
    await runTests(args, await cwd())
  })
  registerCommand(context, 'go.test.cursorOrPrevious', async () => {
    const args = testArgumentsAtCursor(await linesToCursor())
    if (args) {
      await runTests(args, await cwd())
      return
    }
    await coc.commands.executeCommand('go.test.previous')
  })
  registerCommand(context, 'go.subtest.cursor', async () => {
    const testName = testNameAtCursor(await linesToCursor())
    const subtestName = await coc.workspace.nvim.eval('expand("<cword>")') as string
    if (!testName || !subtestName) {
      coc.window.showMessage('Place the cursor on a subtest inside a Go test function.', 'warning')
      return
    }
    await runTests(['-run', `^${escapeRegExp(testName)}$/${escapeRegExp(subtestName)}$`], await cwd())
  })
  registerCommand(context, 'go.test.previous', async () => {
    const previous = getPreviousTest()
    if (!previous) {
      coc.window.showMessage('No previous Go test command.', 'warning')
      return
    }
    await runTests(previous.args, previous.cwd)
  })
  registerCommand(context, 'go.test.coverage', async () => runTests(['-cover'], await cwd()))
  registerCommand(context, 'go.toggle.test.file', async () => {
    const file = await activeFile()
    const target = file ? counterpartGoFile(file) : undefined
    if (!target) {
      coc.window.showMessage('Open a Go file first.', 'warning')
      return
    }
    await coc.workspace.openResource(fileUri(target))
  })
  registerCommand(context, 'go.test.cancel', killTests)
  registerCommand(context, 'go.test.showOutput', showOutput)
}

export function registerBenchmarkCommands(context: ExtensionContext): void {
  const cwd = activeDirectory
  registerCommand(context, 'go.benchmark.package', async () =>
    runTests(['-run', '^$', '-bench', '.', ...benchmarkFlags()], await cwd()))
  registerCommand(context, 'go.benchmark.cursor', async () => {
    const args = testArgumentsAtCursor(await linesToCursor())
    if (!args?.includes('-bench')) {
      coc.window.showMessage('No Go benchmark found at the cursor.', 'warning')
      return
    }
    await runTests([...args, ...benchmarkFlags()], await cwd())
  })
  registerCommand(context, 'go.benchmark.file', async () => {
    const args = testArgumentsForFile(await currentBufferLines(), true)
    if (!args) {
      coc.window.showMessage('No Go benchmarks found in the current file.', 'warning')
      return
    }
    await runTests([...args, ...benchmarkFlags()], await cwd())
  })
}
