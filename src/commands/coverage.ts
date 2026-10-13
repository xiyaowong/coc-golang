import type { Ctx } from '../ctx'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { window, workspace } from 'coc.nvim'
import { coverageFromProfile } from '../coverage'
import { activeDirectory, activeGoFile } from '../editor'

// Coverage commands. `go.test.coverage` toggles coverage for the current
// package: applying it runs `go test -coverprofile` and highlights the loaded
// buffers; applying again (or saving an edited Go file) clears the highlights.
// `go.apply.coverprofile` applies an existing profile file.
export function registerCoverageCommands(ctx: Ctx): void {
  // Runs the tests of the current package with coverage and highlights the
  // result. The profile of a failing run is still applied, since it shows what
  // the tests reached before the failure.
  const runWithCoverage = async (): Promise<void> => {
    const directory = await activeDirectory()
    const profile = join(tmpdir(), `go-code-cover-${Date.now()}`)
    const args = [`-coverprofile=${profile}`]
    const coverMode = ctx.config.get('coverMode', 'default')
    if (coverMode !== 'default') args.push('-covermode', coverMode)
    args.push(...ctx.config.testFlags(), './...')

    const result = await ctx.process.goProcess('test', args, { cwd: directory })
    ctx.output.show()
    if (result.code !== 0) window.showErrorMessage(`go test exited with code ${result.code}`)
    let coverage
    try {
      coverage = await coverageFromProfile(ctx, profile, directory)
    } catch {
      window.showErrorMessage('Coverage profile was not generated; the tests may have failed to build.')
      return
    }
    if (!coverage.size) {
      window.showWarningMessage('No Go tests, examples, or benchmarks found in this package.')
      return
    }
    await ctx.coverage.apply(coverage)
  }

  ctx.commands.handle('go.test.coverage', async () => {
    if (ctx.coverage.hasCoverage()) {
      ctx.coverage.clear()
      return
    }
    await runWithCoverage()
  })

  ctx.commands.handle('go.apply.coverprofile', async (profilePath?: string) => {
    const file = await activeGoFile()
    if (!file) return
    profilePath ??= await window.requestInput('Path to the coverage profile', workspace.cwd)
    profilePath = profilePath?.trim()
    if (!profilePath) return
    let coverage
    try {
      coverage = await coverageFromProfile(ctx, profilePath, await activeDirectory())
    } catch (error) {
      window.showErrorMessage(`Cannot read the coverage profile ${profilePath}: ${String(error)}`)
      return
    }
    if (!coverage.size) {
      window.showWarningMessage('The coverage profile has no coverage blocks.')
      return
    }
    await ctx.coverage.apply(coverage)
  })
}
