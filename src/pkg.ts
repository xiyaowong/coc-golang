import type { CancellationToken, Disposable, ListContext, ListItem } from 'coc.nvim'
import type { Ctx } from './ctx'
import { BasicList, nvim, window } from 'coc.nvim'
import nodeFetch from 'node-fetch'
import { activeDirectory } from './editor'
import { taskLabels } from './status'

type ActionName = 'get' | 'install' | 'download'

const endpoint = 'https://pkg.go.dev/v1/search'
const resultLimit = 100
const requestTimeout = 10_000
// coc.nvim reloads an interactive list shortly after typing stops; waiting a
// little longer keeps one request per pause instead of one per keystroke.
const waitingTime = 300
// Column widths for the row layout: `path`, `version`, `synopsis`. The path is
// the only unbounded part, so the two offsets below are fixed and the highlights
// can be anchored to them.
const pathWidth = 46
const versionWidth = 10
const versionOffset = pathWidth + 1
const synopsisOffset = pathWidth + versionWidth + 2

interface SearchResult {
  packagePath: string
  modulePath: string
  version: string
  synopsis: string
}

// Waits `ms`, or gives up as soon as the token is cancelled. A timer is not
// something the runtime can abort, so a load that is replaced by a newer one
// would otherwise sit here for the rest of its wait.
function wait(ms: number, token?: CancellationToken): Promise<void> {
  if (token?.isCancellationRequested) return Promise.resolve()
  return new Promise<void>((resolve) => {
    let listener: Disposable | undefined
    const timer = setTimeout(() => {
      listener?.dispose()
      resolve()
    }, ms)
    listener = token?.onCancellationRequested(() => {
      clearTimeout(timer)
      listener?.dispose()
      resolve()
    })
  })
}

function truncate(text: string, width: number): string {
  return text.length > width ? `${text.slice(0, width - 1)}…` : text
}

// pkg.go.dev writes a synopsis as a single line; a stray newline would split the
// row across two list entries.
function flatten(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}

function toItem(result: SearchResult): ListItem {
  const label = [
    truncate(result.packagePath, pathWidth).padEnd(pathWidth),
    result.version.padEnd(versionWidth),
    flatten(result.synopsis),
  ].join(' ')
  return {
    label,
    // Filtering on the rendered row preserves pkg.go.dev's relevance order, which
    // an interactive list keeps, and highlights the characters the query matched.
    filterText: label,
    data: result,
  }
}

// Searches pkg.go.dev and acts on what it returns: `get` adds the package to the
// module, `install` installs it into GOBIN, and `download` fills the module
// cache. The version comes from the go command rather than the search, so a
// result the user picks is never pinned to a stale release.
export class PkgSearch extends BasicList {
  readonly name = 'pkg_search'
  readonly description = 'Search packages on pkg.go.dev'
  readonly defaultAction = 'get'
  readonly interactive = true

  private cached?: { query: string, results: SearchResult[] }

  constructor(private readonly ctx: Ctx) {
    super()
    this.addMultipleAction('get', items => this.act('get', items))
    this.addMultipleAction('install', items => this.act('install', items))
    this.addMultipleAction('download', items => this.act('download', items))
  }

  async loadItems(context: ListContext, token?: CancellationToken): Promise<ListItem[]> {
    const query = context.input.trim()
    // An empty filter is the user having asked for nothing yet, so there is
    // nothing to look up and the list stays empty.
    if (!query) return []
    const results = await this.search(query, token)
    if (!results.length) return [{ label: 'No packages found.' }]
    return results.map(toItem)
  }

  private async search(query: string, token?: CancellationToken): Promise<SearchResult[]> {
    if (this.cached?.query === query) return this.cached.results
    await wait(waitingTime, token)
    // A newer keystroke replaced this load; it drops the query it was about to
    // ask for, and the load that replaced it answers for the current input.
    if (token?.isCancellationRequested) return []
    if (this.cached?.query === query) return this.cached.results

    const done = this.ctx.statusBar.begin(taskLabels.search)
    try {
      const response = await nodeFetch(`${endpoint}?${new URLSearchParams({
        q: query,
        limit: String(resultLimit),
      })}`, { timeout: requestTimeout })
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`)
      const body = await response.json() as { items?: SearchResult[] }
      const results = body.items ?? []
      this.cached = { query, results }
      return results
    } catch (error) {
      window.showWarningMessage(`Package search failed: ${String(error)}`)
      return []
    } finally {
      done()
    }
  }

  private async act(action: ActionName, items: ListItem[]): Promise<void> {
    const results = items.map(item => item.data as SearchResult)
    if (!results.length) return
    // One invocation per package, on its own line, so a multiple selection runs
    // through a single shell rather than one shell per package.
    const commands = results.map(result => action === 'download'
      ? ['mod', 'download', result.modulePath]
      : [action, result.packagePath])
    await this.ctx.terminal.runLines(commands, {
      cwd: await activeDirectory(),
      focus: true,
    })
  }

  doHighlight(): void {
    // coc.nvim calls this once, when the list window is created, and the matches
    // for the typed query are applied on top of it as highlight spans.
    nvim.pauseNotification()
    nvim.command(`syntax match PkgSearchPath /^.\\{${pathWidth}}/`, true)
    nvim.command(`syntax match PkgSearchVersion /^.\\{${versionOffset}}\\zs.\\{${versionWidth}}/`, true)
    nvim.command(`syntax match PkgSearchSynopsis /^.\\{${synopsisOffset}}\\zs.*/`, true)
    nvim.command('highlight default link PkgSearchPath Identifier', true)
    nvim.command('highlight default link PkgSearchVersion Constant', true)
    nvim.command('highlight default link PkgSearchSynopsis Comment', true)
    void nvim.resumeNotification()
  }
}

export function registerPkgCommands(ctx: Ctx): void {
  ctx.commands.handle('go.pkg.search', () => nvim.command('CocList --interactive pkg_search'))
}
