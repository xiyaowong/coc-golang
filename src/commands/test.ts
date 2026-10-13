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
} from '../editor/editor'
import { escapeRegExp, isTestName, testArgumentsAtCursor, testArgumentsForFile, testNameAtCursor } from '../test/utils'

export class TestCommands {
  constructor(private readonly ctx: Ctx) {}

  private benchmarkFlags(): string[] {
    return this.ctx.config.get<string[]>('benchmarkFlags', [])
  }

  private async pickAndRun(): Promise<void> {
    const directory = await activeDirectory()
    try {
      const result = await this.ctx.process.goProcess('test', ['-list', '.'], { cwd: directory })
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
        ? ['-run', '^$', '-bench', `^${escaped}$`, ...this.benchmarkFlags()]
        : ['-run', `^${escaped}$`]
      await this.ctx.tests.run(args, directory)
    } catch (error) {
      window.showErrorMessage(`Failed to list Go tests: ${String(error)}`)
    }
  }

  private async runSelected(args: string[] | undefined, warning: string): Promise<void> {
    if (!args) {
      window.showWarningMessage(warning)
      return
    }
    await this.ctx.tests.run(args, await activeDirectory())
  }

  register(): void {
    this.ctx.commands.handle('go.test.package', async () => this.ctx.tests.run([], await activeDirectory()))
    this.ctx.commands.handle('go.test.explorer', () => this.pickAndRun())
    this.ctx.commands.handle('go.test.workspace', async () => {
      for (const directory of workspaceDirectories()) await this.ctx.tests.run(['./...'], directory)
    })
    this.ctx.commands.handle('go.test.file', async () =>
      this.runSelected(testArgumentsForFile(await currentBufferLines()), 'No Go tests or examples found in the current file.'))
    this.ctx.commands.handle('go.test.cursor', async () =>
      this.runSelected(testArgumentsAtCursor(await linesToCursor()), 'No Go test, benchmark, or example found at the cursor.'))
    this.ctx.commands.handle('go.test.cursorOrPrevious', async () => {
      const args = testArgumentsAtCursor(await linesToCursor())
      if (args) await this.ctx.tests.run(args, await activeDirectory())
      else await commands.executeCommand('go.test.previous')
    })
    this.ctx.commands.handle('go.subtest.cursor', async () => {
      const testName = testNameAtCursor(await linesToCursor())
      const subtestName = await wordAtCursor()
      if (!testName || !subtestName) {
        window.showWarningMessage('Place the cursor on a subtest inside a Go test function.')
        return
      }
      await this.ctx.tests.run(['-run', `^${escapeRegExp(testName)}$/${escapeRegExp(subtestName)}$`], await activeDirectory())
    })
    this.ctx.commands.handle('go.test.previous', async () => {
      const previous = this.ctx.tests.getPrevious()
      if (!previous) {
        window.showWarningMessage('No previous Go test command.')
        return
      }
      await this.ctx.tests.run(previous.args, previous.cwd)
    })
    this.ctx.commands.handle('go.test.coverage', async () => this.ctx.tests.run(['-cover'], await activeDirectory()))
    this.ctx.commands.handle('go.toggle.test.file', async () => {
      const file = await activeGoFile()
      const target = file ? counterpartGoFile(file) : undefined
      if (!target) return
      await workspace.openResource(fileUri(target))
    })
    this.ctx.commands.handle('go.test.cancel', () => this.ctx.terminal.current()?.sendText('\x03', false))
    this.ctx.commands.handle('go.test.showOutput', async () => {
      const current = this.ctx.terminal.current()
      if (!current) {
        window.showWarningMessage('No Go terminal. Run a Go command first.')
        return
      }
      await current.show(true)
    })

    this.ctx.commands.handle('go.benchmark.package', async () =>
      this.ctx.tests.run(['-run', '^$', '-bench', '.', ...this.benchmarkFlags()], await activeDirectory()))
    this.ctx.commands.handle('go.benchmark.cursor', async () => {
      const args = testArgumentsAtCursor(await linesToCursor())
      await this.runSelected(
        args?.includes('-bench') ? [...args, ...this.benchmarkFlags()] : undefined,
        'No Go benchmark found at the cursor.',
      )
    })
    this.ctx.commands.handle('go.benchmark.file', async () => {
      const args = testArgumentsForFile(await currentBufferLines(), { benchmarks: true })
      await this.runSelected(args && [...args, ...this.benchmarkFlags()], 'No Go benchmarks found in the current file.')
    })
  }
}
