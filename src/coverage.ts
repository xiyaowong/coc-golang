import type { Document } from 'coc.nvim'
import type { Ctx } from './ctx'
import { readFileSync } from 'node:fs'
import { isAbsolute, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Range, window, workspace } from 'coc.nvim'
import { DisposableStore } from './disposable'

export interface CoverageBlock {
  // The profile's file name: either a real path or `import/path/file.go`.
  name: string
  startLine: number
  startCharacter: number
  endLine: number
  endCharacter: number
  count: number
}

export interface FileCoverage {
  covered: CoverageBlock[]
  uncovered: CoverageBlock[]
}

// A parsed `go test -coverprofile` file, minus the `mode:` header line.
export function parseCoverProfile(content: string): CoverageBlock[] {
  const blocks: CoverageBlock[] = []
  let header = false
  for (const line of content.split(/\r?\n/)) {
    if (!header) {
      if (/^mode: \S+$/.test(line)) header = true
      continue
    }
    const match = /^(\S+):(\d+)\.(\d+),(\d+)\.(\d+) (\d+) (\d+)/.exec(line)
    if (!match) continue
    const [startLine, startCharacter, endLine, endCharacter] = [2, 3, 4, 5].map(index => Number(match[index]))
    // Line directives produce bogus positions; anything below the first line
    // or column cannot be a real source position.
    if (startLine < 1 || startCharacter < 1 || endLine < 1 || endCharacter < 1) continue
    blocks.push({
      name: match[1],
      startLine: startLine - 1,
      startCharacter: startCharacter - 1,
      endLine: endLine - 1,
      endCharacter: endCharacter - 1,
      count: Number(match[6]),
    })
  }
  return blocks
}

// TEMP DEBUG: remove after coverage highlight is verified.
let debugOutput: ((message: string) => void) | undefined
const debug = (message: string): void => debugOutput?.(message)

// Maps the package paths named in the profile to their directories with
// `go list`, so profile entries like `example.com/pkg/file.go` resolve to real
// files.
async function packageDirectories(ctx: Ctx, blocks: CoverageBlock[], dir: string): Promise<Map<string, string>> {
  const packagePaths = new Set<string>()
  for (const { name } of blocks) {
    if (isAbsolute(name) || name.startsWith('.')) continue
    const lastSlash = name.lastIndexOf('/')
    if (lastSlash !== -1) packagePaths.add(name.slice(0, lastSlash))
  }
  const mapping = new Map<string, string>()
  if (!packagePaths.size) return mapping

  const result = await ctx.process.captureGo(
    'list',
    ['-f', '{{.ImportPath}}\t{{.Dir}}', ...packagePaths],
    { cwd: dir },
  )
  debug(`go list code=${result.code} stdout=${JSON.stringify(result.stdout)}`)
  if (result.code !== 0) return mapping
  for (const line of result.stdout.split(/\r?\n/)) {
    const [importPath, packageDir] = line.split('\t')
    debug(`go list line=${JSON.stringify(line)} importPath=${JSON.stringify(importPath)} packageDir=${JSON.stringify(packageDir)}`)
    if (importPath && packageDir) mapping.set(importPath, packageDir)
  }
  return mapping
}

// Resolves each profile entry to a real file path, falling back to `dir` for
// packages that `go list` did not report.
export async function coverageFromProfile(
  ctx: Ctx,
  profilePath: string,
  dir: string,
): Promise<Map<string, FileCoverage>> {
  const blocks = parseCoverProfile(readFileSync(profilePath, 'utf8'))
  debug(`parsed ${blocks.length} blocks from ${profilePath}`)
  const directories = await packageDirectories(ctx, blocks, dir)
  debug(`go list mapping: ${JSON.stringify([...directories.entries()])}`)

  const coverage = new Map<string, FileCoverage>()
  for (const block of blocks) {
    let file = block.name
    if (!isAbsolute(file)) {
      const lastSlash = file.lastIndexOf('/')
      if (lastSlash === -1) {
        file = resolve(dir, file)
      } else {
        const packageDir = directories.get(file.slice(0, lastSlash)) ?? resolve(dir, file.slice(0, lastSlash))
        file = `${packageDir}${sep}${file.slice(lastSlash + 1)}`
      }
    }
    // The go tool prefixes paths outside the current directory with `_`.
    if (file.startsWith('_')) file = file.slice(1)
    debug(`resolved profile entry ${block.name} -> ${file} (count=${block.count})`)
    let entry = coverage.get(file)
    if (!entry) {
      entry = { covered: [], uncovered: [] }
      coverage.set(file, entry)
    }
    ;(block.count > 0 ? entry.covered : entry.uncovered).push(block)
  }
  debug(`coverage files: ${JSON.stringify([...coverage.keys()])}`)
  return coverage
}

// Holds the coverage highlights of the last run and draws them into every
// loaded Go buffer the profile mentions. Works on both vim and neovim through
// coc.nvim's Buffer API (textprops on vim, extmarks on neovim).
export class CoverageManager extends DisposableStore {
  private static readonly namespace = 'coc-go-coverage'
  private static readonly groups = {
    covered: 'CocCoverageCovered',
    uncovered: 'CocCoverageUncovered',
  } as const

  private supported: boolean | undefined
  private groupsReady = false
  private applied = false

  constructor(private readonly ctx: Ctx) {
    super()
    debugOutput = (message: string) => this.ctx.output.appendLine(`[coverage] ${message}`)
    this.track(workspace.onDidSaveTextDocument((document): void => {
      // Highlights describe the tested code; saving an edit makes them stale.
      if (this.applied && document.languageId === 'go') this.clear()
    }))
  }

  hasCoverage(): boolean {
    return this.applied
  }

  // Links the coverage groups to diff colors when the colorscheme has not
  // defined them, so the highlights work out of the box.
  private async ensureGroups(): Promise<void> {
    if (this.groupsReady) return
    const nvim = workspace.nvim
    const defaults: [string, string][] = [
      [CoverageManager.groups.covered, 'DiffAdd'],
      [CoverageManager.groups.uncovered, 'DiffDelete'],
    ]
    for (const [group, target] of defaults) {
      if (Number(await nvim.call('hlexists', [group]))) continue
      if (Number(await nvim.call('hlexists', [target]))) {
        await nvim.command(`highlight default link ${group} ${target}`)
      }
    }
    this.groupsReady = true
  }

  clear(): void {
    debug('clear')
    this.applied = false
    if (this.supported === false) return
    for (const document of workspace.documents) {
      if (document.languageId !== 'go') continue
      document.buffer.clearNamespace(CoverageManager.namespace)
    }
  }

  // Applies coverage highlights to every loaded Go buffer that the profile
  // mentions.
  async apply(coverage: Map<string, FileCoverage>): Promise<void> {
    this.clear()
    debug(`apply: coverage files=${JSON.stringify([...coverage.keys()])}`)
    if (this.supported === undefined) {
      // Buffer highlights are extmarks on neovim, textprops on vim8 (+textprop,
      // built in since 8.2).
      this.supported = workspace.isNvim || (workspace.isVim && workspace.env.textprop === true)
      debug(`editor support: isNvim=${workspace.isNvim} isVim=${workspace.isVim} textprop=${workspace.env.textprop} -> supported=${this.supported}`)
      if (!this.supported) {
        window.showWarningMessage(
          'Coverage highlighting needs neovim, or vim compiled with the +textprop feature.',
        )
        return
      }
    }
    await this.ensureGroups()
    debug(`loaded documents: ${workspace.documents.map(document => `${document.bufnr}:${document.uri}:${document.languageId}`).join(', ') || '(none)'}`)
    let applied = false
    for (const document of workspace.documents) {
      const fileCoverage = fileCoverageFor(document, coverage)
      debug(`match ${document.uri} -> ${fileCoverage ? `${fileCoverage.covered.length} covered, ${fileCoverage.uncovered.length} uncovered` : 'none'}`)
      if (!fileCoverage) continue
      for (const [group, blocks] of [
        [CoverageManager.groups.covered, fileCoverage.covered],
        [CoverageManager.groups.uncovered, fileCoverage.uncovered],
      ] as const) {
        const ranges = blocks.map(block => Range.create(
          block.startLine,
          block.startCharacter,
          block.endLine,
          block.endCharacter,
        ))
        if (ranges.length) {
          debug(`highlightRanges bufnr=${document.bufnr} group=${group} ranges=${JSON.stringify(ranges.slice(0, 3))}${ranges.length > 3 ? ` (+${ranges.length - 3} more)` : ''}`)
          document.buffer.highlightRanges(CoverageManager.namespace, group, ranges)
          applied = true
        }
      }
    }
    this.applied = applied
    debug(`done, applied=${applied}`)
    this.ctx.output.show()
    if (!applied) this.ctx.output.appendLine('Coverage profile matched no loaded Go buffers.')
  }

  override dispose(): void {
    this.clear()
    super.dispose()
  }
}

function fileCoverageFor(document: Document, coverage: Map<string, FileCoverage>): FileCoverage | undefined {
  if (document.languageId !== 'go' || !document.uri.startsWith('file:')) return undefined
  try {
    const file = fileURLToPath(document.uri)
    debug(`document ${document.uri} -> ${file}`)
    return coverage.get(file)
  } catch (error) {
    debug(`document ${document.uri} -> fileURLToPath failed: ${String(error)}`)
    return undefined
  }
}
