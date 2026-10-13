import type { Ctx } from '../ctx'
import { commands, window, workspace } from 'coc.nvim'
import {
  activeDirectory,
  activeGoFile,
  counterpartGoFile,
  currentBufferLines,
  fileUri,
  linesToCursor,
  wordAtCursor,
  workspaceDirectories,
} from '../editor'
import { escapeRegExp, isTestName, testArgumentsAtCursor, testArgumentsForFile, testNameAtCursor } from '../test/utils'

export function registerTestCommands(ctx: Ctx): void {
  const benchmarkFlags = (): string[] => ctx.config.get<string[]>('benchmarkFlags', [])

  const pickAndRun = async (): Promise<void> => {
    const directory = await activeDirectory()
    try {
      const result = await ctx.process.goProcess('test', ['-list', '.'], { cwd: directory })
      const names = result.stdout.split(/\r?\n/).filter(isTestName)
      if (result.code !== 0) {
        window.showErrorMessage(`go test -list exited with code ${result.code}`)
        return
      }
      if (!names.length) {
        window.showWarningMessage('No Go tests, examples, or benchmarks found in this package.')
        return
      }
      const name = await window.showQuickPick(names, { title: 'Select a Go test or benchmark', placeHolder: 'Type to filter' })
      if (!name) return
      const escaped = escapeRegExp(name)
      const args = name.startsWith('Benchmark')
        ? ['-run', '^$', '-bench', `^${escaped}$`, ...benchmarkFlags()]
        : ['-run', `^${escaped}$`]
      await ctx.tests.run(args, directory)
    } catch (error) {
      window.showErrorMessage(`Failed to list Go tests: ${String(error)}`)
    }
  }

  const runSelected = async (args: string[] | undefined, warning: string): Promise<void> => {
    if (!args) {
      window.showWarningMessage(warning)
      return
    }
    await ctx.tests.run(args, await activeDirectory())
  }

  ctx.commands.handle('go.test.package', async () => ctx.tests.run([], await activeDirectory()))
  ctx.commands.handle('go.test.explorer', () => pickAndRun())
  ctx.commands.handle('go.test.workspace', async () => {
    for (const directory of workspaceDirectories()) await ctx.tests.run(['./...'], directory)
  })
  ctx.commands.handle('go.test.file', async () =>
    runSelected(testArgumentsForFile(await currentBufferLines()), 'No Go tests or examples found in the current file.'))
  ctx.commands.handle('go.test.cursor', async () =>
    runSelected(testArgumentsAtCursor(await linesToCursor()), 'No Go test, benchmark, or example found at the cursor.'))
  ctx.commands.handle('go.test.cursorOrPrevious', async () => {
    const args = testArgumentsAtCursor(await linesToCursor())
    if (args) await ctx.tests.run(args, await activeDirectory())
    else await commands.executeCommand('go.test.previous')
  })
  ctx.commands.handle('go.subtest.cursor', async () => {
    const testName = testNameAtCursor(await linesToCursor())
    const subtestName = await wordAtCursor()
    if (!testName || !subtestName) {
      window.showWarningMessage('Place the cursor on a subtest inside a Go test function.')
      return
    }
    await ctx.tests.run(['-run', `^${escapeRegExp(testName)}$/${escapeRegExp(subtestName)}$`], await activeDirectory())
  })
  ctx.commands.handle('go.test.previous', async () => {
    const previous = ctx.tests.getPrevious()
    if (!previous) {
      window.showWarningMessage('No previous Go test command.')
      return
    }
    await ctx.tests.run(previous.args, previous.cwd)
  })
  ctx.commands.handle('go.toggle.test.file', async () => {
    const file = await activeGoFile()
    const target = file ? counterpartGoFile(file) : undefined
    if (!target) return
    await workspace.openResource(fileUri(target))
  })
  ctx.commands.handle('go.test.cancel', () => ctx.terminal.current()?.sendText('\x03', false))
  ctx.commands.handle('go.test.showOutput', async () => {
    const current = ctx.terminal.current()
    if (!current) {
      window.showWarningMessage('No Go terminal. Run a Go command first.')
      return
    }
    await current.show(true)
  })

  ctx.commands.handle('go.benchmark.package', async () =>
    ctx.tests.run(['-run', '^$', '-bench', '.', ...benchmarkFlags()], await activeDirectory()))
  ctx.commands.handle('go.benchmark.cursor', async () => {
    const args = testArgumentsAtCursor(await linesToCursor())
    await runSelected(
      args?.includes('-bench') ? [...args, ...benchmarkFlags()] : undefined,
      'No Go benchmark found at the cursor.',
    )
  })
  ctx.commands.handle('go.benchmark.file', async () => {
    const args = testArgumentsForFile(await currentBufferLines(), { benchmarks: true })
    await runSelected(args && [...args, ...benchmarkFlags()], 'No Go benchmarks found in the current file.')
  })
}
