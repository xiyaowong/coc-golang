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
  // Zero-based line and character bounds, as written in the profile.
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

// A parsed `go test -coverprofile` file. The first line is `mode: <mode>`; each
// following line is `name.go:startLine.startCol,endLine.endCol hits coverCount`.
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
    // Line directives produce bogus positions; anything below the first line or
    // column cannot be a real source position (vscode-go does the same).
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
  if (result.code !== 0) return mapping
  for (const line of result.stdout.split(/\r?\n/)) {
    const [importPath, packageDir] = line.split('\t')
    if (importPath && packageDir) mapping.set(importPath, packageDir)
  }
  return mapping
}

// Resolves each profile entry to a real file path and groups its blocks into
// covered and uncovered sets.
export async function coverageFromProfile(
  ctx: Ctx,
  profilePath: string,
  dir: string,
): Promise<Map<string, FileCoverage>> {
  const blocks = parseCoverProfile(readFileSync(profilePath, 'utf8'))
  const directories = await packageDirectories(ctx, blocks, dir)

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
    let entry = coverage.get(file)
    if (!entry) {
      entry = { covered: [], uncovered: [] }
      coverage.set(file, entry)
    }
    ;(block.count > 0 ? entry.covered : entry.uncovered).push(block)
  }
  return coverage
}

// Holds the coverage highlights of the last run and draws them into every
// loaded Go buffer the profile mentions. Works on both vim and neovim through
// coc.nvim's Buffer API (textprops on vim, extmarks on neovim).
export class CoverageManager extends DisposableStore {
  private static readonly namespace = 'coc-go-coverage'
  private supported: boolean | undefined
  private applied = false

  constructor(private readonly ctx: Ctx) {
    super()
    this.track(workspace.onDidSaveTextDocument((document): void => {
      // Highlights describe the tested code; saving an edit makes them stale.
      if (this.applied && document.languageId === 'go') this.clear()
    }))
  }

  hasCoverage(): boolean {
    return this.applied
  }

  clear(): void {
    this.applied = false
    if (this.supported === false) return
    for (const document of workspace.documents) {
      if (document.languageId !== 'go') continue
      document.buffer.clearNamespace(CoverageManager.namespace)
    }
  }

  // Applies coverage highlights to every loaded Go buffer that the profile
  // mentions. Highlight groups are `CocCoverageCovered` and
  // `CocCoverageUncovered`.
  async apply(coverage: Map<string, FileCoverage>): Promise<void> {
    this.clear()
    if (this.supported === undefined) {
      // Buffer highlight support: extmarks on neovim, textprops on vim8
      // (requires +textprop, built in since 8.2). Everything else is out of
      // luck; tell the user instead of erroring.
      this.supported = workspace.isNvim || (workspace.isVim && workspace.env.textprop === true)
      if (!this.supported) {
        window.showWarningMessage(
          'Coverage highlighting needs neovim, or vim compiled with the +textprop feature.',
        )
        return
      }
    }
    let applied = false
    for (const document of workspace.documents) {
      const fileCoverage = fileCoverageFor(document, coverage)
      if (!fileCoverage) continue
      for (const [group, blocks] of [
        ['CocCoverageCovered', fileCoverage.covered],
        ['CocCoverageUncovered', fileCoverage.uncovered],
      ] as const) {
        const ranges = blocks.map(block => Range.create(
          block.startLine,
          block.startCharacter,
          block.endLine,
          block.endCharacter,
        ))
        if (ranges.length) {
          document.buffer.highlightRanges(CoverageManager.namespace, group, ranges)
          applied = true
        }
      }
    }
    this.applied = applied
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
    return coverage.get(fileURLToPath(document.uri))
  } catch {
    return undefined
  }
}
