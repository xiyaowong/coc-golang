import type { Document } from 'coc.nvim'
import type { Ctx } from './ctx'
import { readFileSync } from 'node:fs'
import { isAbsolute, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Range, window, workspace } from 'coc.nvim'
import { DisposableStore } from './disposable'

export interface CoverageBlock {
  // A real path or `import/path/file.go`, as written in the profile.
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

// Parses a `go test -coverprofile` file, minus the `mode:` header line.
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
    // Line directives produce bogus positions.
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

// Maps the import paths named in the profile to their directories with `go list`.
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

// Resolves each profile entry to a real file path.
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

// Draws coverage highlights into loaded Go buffers, on both vim and neovim.
export class CoverageManager extends DisposableStore {
  private static readonly namespace = 'coc-go-coverage'
  private static readonly countsNamespace = 'go-coverage-counts'
  private static readonly groups = {
    covered: 'CocCoverageCovered',
    uncovered: 'CocCoverageUncovered',
  } as const

  private supported: boolean | undefined
  private groupsReady = false
  private applied = false
  private countsId: number | undefined

  constructor(private readonly ctx: Ctx) {
    super()
    this.track(workspace.onDidSaveTextDocument((document): void => {
      if (this.applied && document.languageId === 'go') this.clear()
    }))
  }

  hasCoverage(): boolean {
    return this.applied
  }

  // Links the coverage groups to diff colors unless the colorscheme defines them.
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
    this.applied = false
    if (this.supported === false) return
    for (const document of workspace.documents) {
      if (document.languageId !== 'go') continue
      document.buffer.clearNamespace(CoverageManager.namespace)
      if (this.countsId) document.buffer.clearNamespace(this.countsId)
    }
  }

  async apply(coverage: Map<string, FileCoverage>): Promise<void> {
    this.clear()
    if (this.supported === undefined) {
      this.supported = workspace.isNvim || (workspace.isVim && workspace.env.textprop === true)
      if (!this.supported) {
        window.showWarningMessage(
          'Coverage highlighting needs neovim, or vim compiled with the +textprop feature.',
        )
        return
      }
    }
    await this.ensureGroups()
    const showCounts = this.ctx.config.get('coverShowCounts', false)
    if (showCounts && !this.countsId) {
      this.countsId = await workspace.nvim.createNamespace(CoverageManager.countsNamespace)
    }
    let applied = false
    for (const document of workspace.documents) {
      const fileCoverage = fileCoverageFor(document, coverage)
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
          document.buffer.highlightRanges(CoverageManager.namespace, group, ranges)
          applied = true
        }
      }
      if (showCounts && this.countsId) this.showCounts(document, this.countsId, fileCoverage)
    }
    this.applied = applied
    if (!applied) this.ctx.output.appendLine('Coverage profile matched no loaded Go buffers.')
  }

  // Annotates each covered block's first line with how often it ran. Only
  // covered blocks have a count to show, as in vscode-go.
  private showCounts(document: Document, srcId: number, coverage: FileCoverage): void {
    const lines = new Map<number, string[]>()
    for (const block of coverage.covered) {
      const text = lines.get(block.startLine)
      if (text) text.push(`--${block.count}--`)
      else lines.set(block.startLine, [`--${block.count}--`])
    }
    for (const [line, text] of lines) {
      document.buffer.setVirtualText(srcId, line, [[text.join(' '), CoverageManager.groups.covered]])
    }
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
