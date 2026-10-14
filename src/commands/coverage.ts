import type { Ctx } from '../ctx'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { window, workspace } from 'coc.nvim'
import { coverageFromProfile } from '../coverage'
import { activeDirectory, activeGoFile, fileUri } from '../editor'
import { taskLabels } from '../status'

interface RecordedProfile {
  file: string
  directory: string
  summary: string
}

// Coverage commands: `go.test.coverage` toggles coverage for the current
// package; `go.apply.coverprofile` applies an existing profile file.
export function registerCoverageCommands(ctx: Ctx): void {
  // `go test` writes the profile into the temporary directory, where the user
  // cannot find it, so the profiles of this session are remembered here.
  const recorded: RecordedProfile[] = []

  // The recorded profiles, newest first, above an action that takes a path of
  // the user's own.
  const pickProfile = async (directory: string): Promise<string | undefined> => {
    const input = 'Path to the coverage profile'
    if (!recorded.length) return window.requestInput(input, directory)
    const action = { label: 'Enter a profile path', file: '' }
    const picked = await window.showQuickPick([action, ...recorded.map(profile => ({
      label: profile.file,
      description: [profile.directory, profile.summary].filter(Boolean).join(' · '),
      file: profile.file,
    }))], {
      title: 'Select a coverage profile',
      placeHolder: 'Type to filter the profiles of previous runs',
      matchOnDescription: true,
    })
    if (!picked) return undefined
    return picked.file || window.requestInput(input, directory)
  }

  const openProfile = async (profilePath?: string): Promise<void> => {
    const directory = await activeDirectory()
    profilePath = (profilePath ?? await pickProfile(directory))?.trim()
    if (!profilePath) return
    if (!existsSync(profilePath)) {
      window.showWarningMessage(`${profilePath} does not exist.`)
      return
    }
    await workspace.openResource(fileUri(profilePath))
  }

  const runWithCoverage = async (): Promise<void> => {
    const directory = await activeDirectory()
    const profile = join(tmpdir(), `go-code-cover-${Date.now()}`)
    const args = [`-coverprofile=${profile}`]
    const coverMode = ctx.config.get('coverMode', 'default')
    if (coverMode !== 'default') args.push('-covermode', coverMode)
    args.push(...ctx.config.testFlags(), './...')

    const result = await ctx.statusBar.during(taskLabels.test, ctx.process.goProcess('test', args, { cwd: directory }))
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
    recorded.unshift({ file: profile, directory, summary: /coverage: (\S+)/.exec(result.output)?.[1] ?? '' })
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
    const directory = await activeDirectory()
    profilePath ??= await pickProfile(directory)
    profilePath = profilePath?.trim()
    if (!profilePath) return
    let coverage
    try {
      coverage = await coverageFromProfile(ctx, profilePath, directory)
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

  ctx.commands.handle('go.show.coverprofile', async (profilePath?: string) => openProfile(profilePath))
}
