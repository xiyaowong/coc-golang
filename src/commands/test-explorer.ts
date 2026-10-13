import type { MarkupContent, TreeDataProvider, TreeItem, TreeItemAction, TreeView } from 'coc.nvim'
import type { Ctx } from '../ctx'
import type { TestPackage } from '../test/run-tests'
import { readFile } from 'node:fs/promises'
import { basename, join, relative } from 'node:path'
import {
  TreeItem as CocTreeItem,
  Emitter,
  MarkupKind,
  Position,
  TreeItemCollapsibleState,
  Uri,
  window,
  workspace,
} from 'coc.nvim'
import { DisposableStore } from '../disposable'
import { workspaceDirectories } from '../editor/editor'
import { GoTestJsonParser, parseGoTestList } from '../test/json'
import { escapeRegExp, isTestName, testFunctions } from '../test/utils'

type Outcome = 'passed' | 'failed' | 'skipped'
type Status = Outcome | 'running'

interface FolderNode {
  kind: 'folder'
  dir: string
  packages: PackageNode[]
}

interface PackageNode {
  kind: 'package'
  dir: string
  importPath: string
  folder: string
  files: FileNode[]
}

interface FileNode {
  kind: 'file'
  file: string
  name: string
  dir: string
  importPath: string
  folder: string
  tests: TestNode[]
}

interface TestNode {
  kind: 'test'
  name: string
  file: string
  line: number
  dir: string
  importPath: string
  folder: string
}

interface SubtestNode {
  kind: 'subtest'
  name: string
  path: string
  dir: string
  importPath: string
  parent: TestNode | SubtestNode
}

type Node = FolderNode | PackageNode | FileNode | TestNode | SubtestNode

const packageKey = (importPath: string): string => importPath
const fileKey = (importPath: string, file: string): string => `${importPath}\u0000${file}`
const testKey = (importPath: string, name: string): string => `${importPath}\u0000${name}`
const testId = (importPath: string, name: string): string => `test:${testKey(importPath, name)}`
const subtestId = (importPath: string, path: string): string => `subtest:${testKey(importPath, path)}`

const statusIcons: Record<Status, { text: string, hlGroup: string }> = {
  passed: { text: '✓', hlGroup: 'CocGoTestPassed' },
  failed: { text: '✗', hlGroup: 'CocGoTestFailed' },
  running: { text: '●', hlGroup: 'CocGoTestRunning' },
  skipped: { text: '○', hlGroup: 'CocGoTestSkipped' },
}

const iconHighlights: Array<[string, string[]]> = [
  ['CocGoTestPassed', ['DiagnosticOk', 'CocSuccess', 'String', 'MoreMsg']],
  ['CocGoTestFailed', ['DiagnosticError', 'CocErrorSign', 'ErrorMsg']],
  ['CocGoTestRunning', ['DiagnosticWarn', 'CocWarningSign', 'Special', 'WarningMsg']],
  ['CocGoTestSkipped', ['DiagnosticInfo', 'CocInfoSign', 'Comment', 'NonText']],
]

function cached<T extends object>(map: Map<string, T>, id: string, create: () => T): T {
  let node = map.get(id)
  if (!node) {
    node = create()
    map.set(id, node)
  }
  return node
}

function within(dir: string, folder: string): string | undefined {
  return dir === folder || (dir.startsWith(folder) && /[/\\]/.test(dir[folder.length])) ? folder : undefined
}

function topTest(node: TestNode | SubtestNode): TestNode {
  let current: TestNode | SubtestNode = node
  while (current.kind === 'subtest') current = current.parent
  return current
}

function isBenchmark(name: string): boolean {
  return name.startsWith('Benchmark')
}

function aggregateStatus(statuses: Array<Status | undefined>): Status | undefined {
  for (const wanted of ['running', 'failed', 'passed', 'skipped'] as const) {
    if (statuses.includes(wanted)) return wanted
  }
  return undefined
}

function summary(statuses: Array<Status | undefined>): string {
  const parts: string[] = []
  for (const [status, label] of [['failed', 'failed'], ['running', 'running'], ['passed', 'passed']] as const) {
    const count = statuses.filter(item => item === status).length
    if (count) parts.push(`${count} ${label}`)
  }
  return parts.join(' · ')
}

// Benchmarks need `-bench` with an empty `-run` to actually execute.
function runArguments(names: string[]): string[] {
  const tests = names.filter(name => !isBenchmark(name)).map(escapeRegExp)
  const benchmarks = names.filter(isBenchmark).map(escapeRegExp)
  const args: string[] = []
  if (tests.length) args.push('-run', `^(${tests.join('|')})$`)
  else if (benchmarks.length) args.push('-run', '^$')
  if (benchmarks.length) args.push('-bench', `^(${benchmarks.join('|')})$`)
  return args
}

function applyStatus(item: TreeItem, status: Status | undefined): void {
  if (status) item.icon = statusIcons[status]
}

export class TestExplorer extends DisposableStore implements TreeDataProvider<Node> {
  private readonly emitter = new Emitter<void>()
  readonly onDidChangeTreeData = this.emitter.event

  private readonly results = new Map<string, { outcome: Outcome, elapsed: number, output: string[] }>()
  private readonly runningIds = new Set<string>()

  private readonly packageNodes = new Map<string, PackageNode>()
  private readonly fileNodes = new Map<string, FileNode>()
  private readonly testNodes = new Map<string, TestNode>()
  private readonly subtestNodes = new Map<string, SubtestNode>()

  private folderDirs: string[] = []
  private topLevel: Node[] = []

  private view: TreeView<Node> | undefined
  // Discovery shells out to `go list` and `go test -list`, which can take a
  // while, so the view shows first and fills in when discovery finishes.
  // Concurrent requests collapse into one run; a request arriving mid-run
  // schedules another pass.
  private discovery: Promise<void> | undefined
  private rediscover = false

  private iconsReady = false

  constructor(private readonly ctx: Ctx) {
    super()
    this.track(this.emitter)
    this.track(workspace.onDidSaveTextDocument((document) => {
      if (this.view && document.uri.endsWith('_test.go')) void this.scheduleDiscovery()
    }))
  }

  // ---------------------------------------------------------------------------
  // Status
  // ---------------------------------------------------------------------------

  private subtestChildren(importPath: string, parentPath: string, parent: TestNode | SubtestNode): SubtestNode[] {
    const prefix = `${testKey(importPath, parentPath)}/`
    const names = new Set<string>()
    for (const key of this.results.keys()) {
      if (!key.startsWith(prefix)) continue
      const name = key.slice(prefix.length).split('/')[0]
      if (name) names.add(name)
    }
    return [...names].sort().map(name => cached(this.subtestNodes, subtestId(importPath, `${parentPath}/${name}`), () => ({
      kind: 'subtest' as const,
      name,
      path: `${parentPath}/${name}`,
      dir: topTest(parent).dir,
      importPath,
      parent,
    })))
  }

  private subtestStatus(node: SubtestNode): Status | undefined {
    if (this.runningIds.has(testId(node.importPath, topTest(node).name))) return 'running'
    return this.results.get(testKey(node.importPath, node.path))?.outcome
  }

  private testStatus(node: TestNode): Status | undefined {
    const id = testId(node.importPath, node.name)
    if (this.runningIds.has(id)) return 'running'
    const self = this.results.get(testKey(node.importPath, node.name))?.outcome
    const prefix = `${testKey(node.importPath, node.name)}/`
    let passed = false
    let skipped = false
    for (const [key, result] of this.results) {
      if (!key.startsWith(prefix)) continue
      if (result.outcome === 'failed') return 'failed'
      if (result.outcome === 'passed') passed = true
      else skipped = true
    }
    return self ?? (passed ? 'passed' : skipped ? 'skipped' : undefined)
  }

  private fileStatus(node: FileNode): Status | undefined {
    return aggregateStatus(node.tests.map(test => this.testStatus(test)))
  }

  private testsUnder(node: PackageNode | FileNode | FolderNode): TestNode[] {
    switch (node.kind) {
      case 'folder': return node.packages.flatMap(pkg => this.testsUnder(pkg))
      case 'package': return node.files.flatMap(file => this.testsUnder(file))
      case 'file': return node.tests
    }
  }

  private resultOf(node: TestNode | SubtestNode): { outcome: Outcome, elapsed: number, output: string[] } | undefined {
    const key = node.kind === 'test' ? testKey(node.importPath, node.name) : testKey(node.importPath, node.path)
    return this.results.get(key)
  }

  private testTooltip(node: TestNode | SubtestNode): MarkupContent {
    const test = node.kind === 'test' ? node : topTest(node)
    const status = node.kind === 'test' ? this.testStatus(node) : this.subtestStatus(node)
    const result = this.resultOf(node)
    const lines = [test.file ? `\`${test.file}:${test.line}\`` : 'Location unknown.']
    if (status === 'running') lines.push('Running…')
    else if (result) lines.push(`${status} in ${result.elapsed.toFixed(2)}s`)
    if (result?.output.length) lines.push(`\`\`\`\n${result.output.join('\n')}\n\`\`\``)
    return { kind: MarkupKind.Markdown, value: lines.join('\n\n') }
  }

  // ---------------------------------------------------------------------------
  // Discovery
  // ---------------------------------------------------------------------------

  private folderFor(dir: string): string {
    let best: string | undefined
    for (const folder of this.folderDirs) {
      const match = within(dir, folder)
      if (match && (!best || folder.length > best.length)) best = match
    }
    return best ?? dir
  }

  private async testLocations(pkg: TestPackage): Promise<Map<string, { file: string, line: number }>> {
    const locations = new Map<string, { file: string, line: number }>()
    for (const name of pkg.testFiles) {
      const file = join(pkg.dir, name)
      let lines: string[]
      try {
        lines = (await readFile(file, 'utf8')).split(/\r?\n/)
      } catch {
        continue
      }
      for (const fn of testFunctions(lines)) {
        if (!locations.has(fn.name)) locations.set(fn.name, { file, line: fn.line })
      }
    }
    return locations
  }

  private async discover(): Promise<void> {
    this.folderDirs = workspaceDirectories()
    this.packageNodes.clear()
    this.fileNodes.clear()
    const packages: PackageNode[] = []

    for (const directory of this.folderDirs) {
      const listed = await this.ctx.tests.listPackages(directory)
      const listedNames = parseGoTestList(await this.listTests(directory), isTestName)
      for (const info of listed) {
        const locations = await this.testLocations(info)
        const names = listedNames.get(info.importPath) ?? [...locations.keys()]
        const folder = this.folderFor(info.dir)
        const pkg = cached(this.packageNodes, packageKey(info.importPath), () => ({
          kind: 'package' as const,
          dir: info.dir,
          importPath: info.importPath,
          folder,
          files: [],
        }))
        pkg.dir = info.dir
        pkg.folder = folder

        // Group the package's tests by the file that defines them.
        const byFile = new Map<string, FileNode>()
        for (const name of names) {
          const location = locations.get(name)
          const file = location?.file ?? (info.testFiles[0] ? join(info.dir, info.testFiles[0]) : '')
          const fileNode = cached(this.fileNodes, fileKey(info.importPath, file), () => ({
            kind: 'file' as const,
            file,
            name: file ? basename(file) : info.importPath,
            dir: info.dir,
            importPath: info.importPath,
            folder,
            tests: [],
          }))
          fileNode.file = file
          fileNode.name = file ? basename(file) : info.importPath
          fileNode.dir = info.dir
          fileNode.folder = folder
          const test = cached(this.testNodes, testId(info.importPath, name), () => ({
            kind: 'test' as const,
            name,
            file,
            line: location?.line ?? 1,
            dir: info.dir,
            importPath: info.importPath,
            folder,
          }))
          test.name = name
          test.file = location?.file ?? test.file
          test.line = location?.line ?? test.line
          test.dir = info.dir
          test.folder = folder
          fileNode.tests.push(test)
          byFile.set(file, fileNode)
        }

        pkg.files = [...byFile.values()]
        for (const fileNode of pkg.files) fileNode.tests.sort((a, b) => a.name.localeCompare(b.name))
        if (pkg.files.length) packages.push(pkg)
      }
    }

    if (this.folderDirs.length <= 1) {
      this.topLevel = packages.sort((a, b) => a.importPath.localeCompare(b.importPath))
    } else {
      const folders = new Map<string, FolderNode>()
      for (const pkg of packages) {
        const folder = cached(folders, pkg.folder, () => ({ kind: 'folder' as const, dir: pkg.folder, packages: [] }))
        folder.packages.push(pkg)
      }
      this.topLevel = [...folders.values()]
    }
  }

  private listTests(dir: string): Promise<string> {
    return this.ctx.process.captureGo('test', ['-json', '-list', '.*', './...'], { cwd: dir })
      .then(result => result.stdout)
  }

  scheduleDiscovery(): Promise<void> {
    if (this.discovery) {
      this.rediscover = true
      return this.discovery
    }
    if (this.view) this.view.message = 'Loading Go tests…'
    this.discovery = (async () => {
      do {
        this.rediscover = false
        try {
          await this.discover()
        } catch (error) {
          window.showErrorMessage(`Failed to discover Go tests: ${String(error)}`)
          return
        }
        this.refresh()
      } while (this.rediscover)
    })().finally(() => {
      this.discovery = undefined
      if (this.view) this.view.message = ''
    })
    return this.discovery
  }

  // ---------------------------------------------------------------------------
  // Provider
  // ---------------------------------------------------------------------------

  refresh(): void {
    this.emitter.fire()
  }

  getTreeItem(element: Node): TreeItem {
    switch (element.kind) {
      case 'folder': {
        const item = new CocTreeItem(basename(element.dir) || element.dir, TreeItemCollapsibleState.Expanded)
        item.tooltip = element.dir
        item.description = summary(element.packages.flatMap(pkg => pkg.files.map(file => this.fileStatus(file))))
        return item
      }
      case 'package': {
        const label = relative(element.folder, element.dir).replace(/\\/g, '/') || '.'
        const item = new CocTreeItem(label, TreeItemCollapsibleState.Expanded)
        item.tooltip = element.importPath
        const statuses = element.files.map(file => this.fileStatus(file))
        item.description = summary(statuses)
        applyStatus(item, aggregateStatus(statuses))
        return item
      }
      case 'file': {
        const item = new CocTreeItem(element.name, TreeItemCollapsibleState.Expanded)
        item.tooltip = element.file
        item.description = summary(element.tests.map(test => this.testStatus(test)))
        applyStatus(item, this.fileStatus(element))
        return item
      }
      case 'test':
      case 'subtest': {
        const path = element.kind === 'test' ? element.name : element.path
        const children = this.subtestChildren(element.importPath, path, element)
        const item = new CocTreeItem(element.name, children.length ? TreeItemCollapsibleState.Expanded : TreeItemCollapsibleState.None)
        item.tooltip = this.testTooltip(element)
        applyStatus(item, element.kind === 'test' ? this.testStatus(element) : this.subtestStatus(element))
        item.command = { title: 'Run Go Test', command: 'go.test.explorer.run', arguments: [element] }
        return item
      }
    }
  }

  getChildren(element?: Node): Node[] {
    if (!element) return this.topLevel
    switch (element.kind) {
      case 'folder': return element.packages.filter(pkg => pkg.files.length)
      case 'package': return element.files
      case 'file': return element.tests
      case 'test': return this.subtestChildren(element.importPath, element.name, element)
      case 'subtest': return this.subtestChildren(element.importPath, element.path, element)
    }
  }

  getParent(element: Node): Node | undefined {
    switch (element.kind) {
      case 'folder': return undefined
      case 'package': return this.folderDirs.length > 1
        ? this.topLevel.find(node => node.kind === 'folder' && node.dir === element.folder)
        : undefined
      case 'file': return this.packageNodes.get(packageKey(element.importPath))
      case 'test': return this.fileNodes.get(fileKey(element.importPath, element.file))
      case 'subtest': return element.parent
    }
  }

  resolveActions(_item: TreeItem, element: Node): TreeItemAction<Node>[] {
    if (element.kind === 'test' || element.kind === 'subtest') {
      return [
        { title: 'Run Test', handler: node => this.runNode(node) },
        { title: 'Go to Test', handler: node => this.openNode(node) },
        { title: 'Run Package Tests', handler: node => this.runPackageOf(node) },
      ]
    }
    if (element.kind === 'file') {
      return [
        { title: 'Run File Tests', handler: node => this.runNode(node) },
        { title: 'Go to File', handler: node => this.openNode(node) },
      ]
    }
    return [{ title: 'Run Tests', handler: node => this.runNode(node) }]
  }

  // ---------------------------------------------------------------------------
  // Running
  // ---------------------------------------------------------------------------

  // Coalesces the refreshes that streaming results would otherwise trigger once
  // per finished test.
  private debouncedRefresh(): () => void {
    let timer: ReturnType<typeof setTimeout> | undefined
    return () => {
      if (timer) return
      timer = setTimeout(() => {
        timer = undefined
        this.refresh()
      }, 80)
    }
  }

  private async executeRun(ids: string[], dir: string, args: string[]): Promise<boolean> {
    for (const id of ids) this.runningIds.add(id)
    this.refresh()
    const parser = new GoTestJsonParser()
    const refresh = this.debouncedRefresh()
    // Update the view as each test finishes, rather than when the run ends.
    parser.onChange(() => {
      for (const result of parser.getTests()) {
        this.results.set(testKey(result.package, result.name), {
          outcome: result.outcome,
          elapsed: result.elapsed,
          output: result.output,
        })
      }
      refresh()
    })
    try {
      await this.ctx.tests.runCaptured(args, dir, line => parser.push(line))
      return parser.getTests().length > 0 || parser.getPackages().some(pkg => pkg.outcome === 'failed')
    } finally {
      for (const id of ids) this.runningIds.delete(id)
      this.refresh()
    }
  }

  private async runTestNodes(nodes: TestNode[], dir: string): Promise<boolean> {
    return this.executeRun(nodes.map(node => testId(node.importPath, node.name)), dir, runArguments(nodes.map(node => node.name)))
  }

  async runTest(node: TestNode): Promise<void> {
    const ok = await this.runTestNodes([node], node.dir)
    if (!ok) window.showWarningMessage(`No results for ${node.name}.`)
  }

  async runSubtest(node: SubtestNode): Promise<void> {
    const segments = node.path.split('/').map(escapeRegExp)
    await this.executeRun([testId(node.importPath, topTest(node).name)], node.dir, ['-run', `^${segments.join('/')}$`])
  }

  async runFile(node: FileNode): Promise<void> {
    await this.runTestNodes(node.tests, node.dir)
  }

  async runPackage(node: PackageNode): Promise<void> {
    await this.runTestNodes(this.testsUnder(node), node.dir)
  }

  async runFolder(node: FolderNode): Promise<void> {
    for (const pkg of node.packages) await this.runPackage(pkg)
  }

  async runNode(node: Node): Promise<void> {
    if (node.kind === 'test') await this.runTest(node)
    else if (node.kind === 'subtest') await this.runSubtest(node)
    else if (node.kind === 'file') await this.runFile(node)
    else if (node.kind === 'package') await this.runPackage(node)
    else await this.runFolder(node)
  }

  async runPackageOf(node: Node): Promise<void> {
    if (node.kind !== 'test' && node.kind !== 'subtest') return
    const pkg = this.packageNodes.get(packageKey(node.importPath))
    if (pkg) await this.runPackage(pkg)
  }

  runAll(): Promise<void> {
    return (async () => {
      await this.scheduleDiscovery()
      for (const node of this.topLevel) await this.runNode(node)
      this.refresh()
    })()
  }

  // ---------------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------------

  private async leaveTreeWindow(): Promise<void> {
    const { nvim } = workspace
    if (String(await nvim.call('getbufvar', ['%', '&filetype'])) !== 'coctree') return
    const windows = await nvim.call('getwininfo') as Array<{ winid: number, bufnr: number }>
    const current = await nvim.call('win_getid') as number
    for (const { winid, bufnr } of windows) {
      if (winid === current) continue
      if (String(await nvim.call('getbufvar', [bufnr, '&filetype'])) !== 'coctree') {
        await nvim.call('win_gotoid', [winid])
        return
      }
    }
  }

  private async subtestLine(node: SubtestNode): Promise<number | undefined> {
    try {
      const lines = (await readFile(topTest(node).file, 'utf8')).split(/\r?\n/)
      const pattern = new RegExp(`\\bRun\\s*\\(\\s*["\`]${escapeRegExp(node.name)}["\`]`)
      const index = lines.findIndex(line => pattern.test(line))
      return index === -1 ? undefined : index + 1
    } catch {
      return undefined
    }
  }

  async openNode(node: Node): Promise<void> {
    if (node.kind === 'package' || node.kind === 'folder') {
      window.showWarningMessage('Only files, tests, and subtests can be located.')
      return
    }
    if (node.kind === 'file') {
      if (!node.file) {
        window.showWarningMessage(`Could not locate ${node.name}.`)
        return
      }
      await this.leaveTreeWindow()
      await workspace.jumpTo(Uri.file(node.file).toString(), Position.create(0, 0))
      return
    }
    const test = node.kind === 'test' ? node : topTest(node)
    if (!test.file) {
      window.showWarningMessage(`Could not locate ${test.name}.`)
      return
    }
    let line = test.line
    if (node.kind === 'subtest') line = await this.subtestLine(node) ?? line
    await this.leaveTreeWindow()
    await workspace.jumpTo(Uri.file(test.file).toString(), Position.create(line - 1, 0))
  }

  // ---------------------------------------------------------------------------
  // View
  // ---------------------------------------------------------------------------

  private async ensureHighlights(): Promise<void> {
    if (this.iconsReady) return
    const { nvim } = workspace
    for (const [group, targets] of iconHighlights) {
      if (Number(await nvim.call('hlexists', [group]))) continue
      for (const target of targets) {
        if (Number(await nvim.call('hlexists', [target]))) {
          await nvim.command(`highlight default link ${group} ${target}`)
          break
        }
      }
    }
    this.iconsReady = true
  }

  async showView(): Promise<void> {
    await this.ensureHighlights()
    if (!this.view) {
      this.view = this.track(window.createTreeView('go-test-explorer', {
        treeDataProvider: this,
        bufhidden: 'hide',
        enableFilter: true,
      }))
      this.view.title = 'Go Tests'
    }
    await this.view.show()
    void this.scheduleDiscovery()
  }

  selection(): Node | undefined {
    return this.view?.selection[0]
  }

  hasView(): boolean {
    return this.view !== undefined
  }
}

// Registers the test explorer's commands and its view.
export class TestExplorerCommands {
  constructor(private readonly ctx: Ctx) {}

  private selection(): Node | undefined {
    return this.ctx.explorer.selection()
  }

  register(): void {
    this.ctx.commands.handle('go.test.explorer.show', () => this.ctx.explorer.showView())
    this.ctx.commands.handle('go.test.explorer.refresh', () => {
      if (!this.ctx.explorer.hasView()) return
      void this.ctx.explorer.scheduleDiscovery()
    })
    this.ctx.commands.handle('go.test.explorer.run', async (node?: Node) => {
      const target = node ?? this.selection()
      if (!target) {
        window.showWarningMessage('Select a test in the Go Tests view first.')
        return
      }
      await this.ctx.explorer.runNode(target)
    })
    this.ctx.commands.handle('go.test.explorer.open', async (node?: Node) => {
      const target = node ?? this.selection()
      if (target) await this.ctx.explorer.openNode(target)
    })
    this.ctx.commands.handle('go.test.explorer.runAll', () => this.ctx.explorer.runAll())
  }
}
