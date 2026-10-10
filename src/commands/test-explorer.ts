import type { ExtensionContext, MarkupContent, TreeItem, TreeItemAction } from 'coc.nvim'
import type { TestPackage } from '../run-tests'
import { readFile } from 'node:fs/promises'
import { basename, join, relative } from 'node:path'
import * as coc from 'coc.nvim'
import { workspaceDirectories } from '../editor'
import { GoTestJsonParser, parseGoTestList } from '../go-test-json'
import { escapeRegExp, isTestName, testFunctions } from '../go-test-utils'
import { captureGo } from '../process'
import { listTestPackages, runTestsCaptured } from '../run-tests'
import { registerCommand } from './index'

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

const results = new Map<string, { outcome: Outcome, elapsed: number, output: string[] }>()
const runningIds = new Set<string>()

const packageNodes = new Map<string, PackageNode>()
const fileNodes = new Map<string, FileNode>()
const testNodes = new Map<string, TestNode>()
const subtestNodes = new Map<string, SubtestNode>()

let folderDirs: string[] = []
let topLevel: Node[] = []

const statusIcons: Record<Status, coc.TreeItemIcon> = {
  passed: { text: '✓', hlGroup: 'CocGoTestPassed' },
  failed: { text: '✗', hlGroup: 'CocGoTestFailed' },
  running: { text: '●', hlGroup: 'CocGoTestRunning' },
  skipped: { text: '○', hlGroup: 'CocGoTestSkipped' },
}

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

function folderFor(dir: string): string {
  let best: string | undefined
  for (const folder of folderDirs) {
    const match = within(dir, folder)
    if (match && (!best || folder.length > best.length)) best = match
  }
  return best ?? dir
}

function topTest(node: TestNode | SubtestNode): TestNode {
  let current: TestNode | SubtestNode = node
  while (current.kind === 'subtest') current = current.parent
  return current
}

function isBenchmark(name: string): boolean {
  return name.startsWith('Benchmark')
}

function subtestChildren(importPath: string, parentPath: string, parent: TestNode | SubtestNode): SubtestNode[] {
  const prefix = `${testKey(importPath, parentPath)}/`
  const names = new Set<string>()
  for (const key of results.keys()) {
    if (!key.startsWith(prefix)) continue
    const name = key.slice(prefix.length).split('/')[0]
    if (name) names.add(name)
  }
  return [...names].sort().map(name => cached(subtestNodes, subtestId(importPath, `${parentPath}/${name}`), () => ({
    kind: 'subtest' as const,
    name,
    path: `${parentPath}/${name}`,
    dir: topTest(parent).dir,
    importPath,
    parent,
  })))
}

function subtestStatus(node: SubtestNode): Status | undefined {
  if (runningIds.has(testId(node.importPath, topTest(node).name))) return 'running'
  return results.get(testKey(node.importPath, node.path))?.outcome
}

function testStatus(node: TestNode): Status | undefined {
  const id = testId(node.importPath, node.name)
  if (runningIds.has(id)) return 'running'
  const self = results.get(testKey(node.importPath, node.name))?.outcome
  const prefix = `${testKey(node.importPath, node.name)}/`
  let passed = false
  let skipped = false
  for (const [key, result] of results) {
    if (!key.startsWith(prefix)) continue
    if (result.outcome === 'failed') return 'failed'
    if (result.outcome === 'passed') passed = true
    else skipped = true
  }
  return self ?? (passed ? 'passed' : skipped ? 'skipped' : undefined)
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

function fileStatus(node: FileNode): Status | undefined {
  return aggregateStatus(node.tests.map(testStatus))
}

// Flattens the tests under a file, package, or folder node, for running them.
function testsUnder(node: PackageNode | FileNode | FolderNode): TestNode[] {
  switch (node.kind) {
    case 'folder': return node.packages.flatMap(testsUnder)
    case 'package': return node.files.flatMap(testsUnder)
    case 'file': return node.tests
  }
}

function applyStatus(item: TreeItem, status: Status | undefined): void {
  if (status) item.icon = statusIcons[status]
}

// ---------------------------------------------------------------------------
// Discovery
// ---------------------------------------------------------------------------

async function testLocations(pkg: TestPackage): Promise<Map<string, { file: string, line: number }>> {
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

async function discoverTests(): Promise<void> {
  folderDirs = workspaceDirectories()
  packageNodes.clear()
  fileNodes.clear()
  const packages: PackageNode[] = []

  for (const directory of folderDirs) {
    const listed = await listTestPackages(directory)
    const listedNames = parseGoTestList(await listTests(directory), isTestName)
    for (const info of listed) {
      const locations = await testLocations(info)
      const names = listedNames.get(info.importPath) ?? [...locations.keys()]
      const folder = folderFor(info.dir)
      const pkg = cached(packageNodes, packageKey(info.importPath), () => ({
        kind: 'package' as const,
        dir: info.dir,
        importPath: info.importPath,
        folder,
        files: [],
      }))
      pkg.dir = info.dir
      pkg.folder = folder

      // Group the package's tests by the file they are defined in, keeping the
      // tree's file order stable (internal test files before external ones).
      const byFile = new Map<string, FileNode>()
      for (const name of names) {
        const location = locations.get(name)
        const file = location?.file ?? (info.testFiles[0] ? join(info.dir, info.testFiles[0]) : '')
        const fileNode = cached(fileNodes, fileKey(info.importPath, file), () => ({
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
        const test = cached(testNodes, testId(info.importPath, name), () => ({
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

  if (folderDirs.length <= 1) {
    topLevel = packages.sort((a, b) => a.importPath.localeCompare(b.importPath))
  } else {
    const folders = new Map<string, FolderNode>()
    for (const pkg of packages) {
      const folder = cached(folders, pkg.folder, () => ({ kind: 'folder' as const, dir: pkg.folder, packages: [] }))
      folder.packages.push(pkg)
    }
    topLevel = [...folders.values()]
  }
}

async function listTests(dir: string): Promise<string> {
  const result = await captureGo('test', ['-json', '-list', '.*', './...'], { cwd: dir })
  return result.stdout
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

class TestDataProvider implements coc.TreeDataProvider<Node> {
  private readonly emitter = new coc.Emitter<void>()
  readonly onDidChangeTreeData = this.emitter.event

  refresh(): void {
    this.emitter.fire()
  }

  getTreeItem(element: Node): TreeItem {
    switch (element.kind) {
      case 'folder': {
        const item = new coc.TreeItem(basename(element.dir) || element.dir, coc.TreeItemCollapsibleState.Expanded)
        item.tooltip = element.dir
        item.description = summary(element.packages.flatMap(pkg => pkg.files.map(fileStatus)))
        return item
      }
      case 'package': {
        const label = relative(element.folder, element.dir).replace(/\\/g, '/') || '.'
        const item = new coc.TreeItem(label, coc.TreeItemCollapsibleState.Expanded)
        item.tooltip = element.importPath
        const statuses = element.files.map(fileStatus)
        item.description = summary(statuses)
        applyStatus(item, aggregateStatus(statuses))
        return item
      }
      case 'file': {
        const item = new coc.TreeItem(element.name, coc.TreeItemCollapsibleState.Expanded)
        item.tooltip = element.file
        item.description = summary(element.tests.map(testStatus))
        applyStatus(item, fileStatus(element))
        return item
      }
      case 'test':
      case 'subtest': {
        const children = subtestChildren(element.importPath, element.kind === 'test' ? element.name : element.path, element)
        const item = new coc.TreeItem(element.name, children.length ? coc.TreeItemCollapsibleState.Expanded : coc.TreeItemCollapsibleState.None)
        item.tooltip = testTooltip(element)
        applyStatus(item, element.kind === 'test' ? testStatus(element) : subtestStatus(element))
        item.command = { title: 'Run Go Test', command: 'go.test.explorer.run', arguments: [element] }
        return item
      }
    }
  }

  getChildren(element?: Node): Node[] {
    if (!element) return topLevel
    switch (element.kind) {
      case 'folder': return element.packages.filter(pkg => pkg.files.length)
      case 'package': return element.files
      case 'file': return element.tests
      case 'test': return subtestChildren(element.importPath, element.name, element)
      case 'subtest': return subtestChildren(element.importPath, element.path, element)
    }
  }

  getParent(element: Node): Node | undefined {
    switch (element.kind) {
      case 'folder': return undefined
      case 'package': return folderDirs.length > 1 ? topLevel.find(node => node.kind === 'folder' && node.dir === element.folder) : undefined
      case 'file': return packageNodes.get(packageKey(element.importPath))
      case 'test': return fileNodes.get(fileKey(element.importPath, element.file))
      case 'subtest': return element.parent
    }
  }

  resolveActions(_item: TreeItem, element: Node): TreeItemAction<Node>[] {
    if (element.kind === 'test' || element.kind === 'subtest') {
      return [
        { title: 'Run Test', handler: node => runNode(node) },
        { title: 'Go to Test', handler: node => openNode(node) },
        { title: 'Run Package Tests', handler: node => runPackageOf(node) },
      ]
    }
    if (element.kind === 'file') {
      return [
        { title: 'Run File Tests', handler: node => runNode(node) },
        { title: 'Go to File', handler: node => openNode(node) },
      ]
    }
    return [{ title: 'Run Tests', handler: node => runNode(node) }]
  }
}

const provider = new TestDataProvider()
let view: coc.TreeView<Node> | undefined

// Discovery shells out to `go list` and `go test -list`, which compile the
// workspace and can take a while, so the view is shown first and the tree fills
// in when discovery finishes. Concurrent requests collapse into one run, and a
// request that arrives mid-run schedules another pass so it still sees the
// latest files.
let discovery: Promise<void> | undefined
let rediscover = false

function scheduleDiscovery(): Promise<void> {
  if (discovery) {
    rediscover = true
    return discovery
  }
  if (view) view.message = 'Loading Go tests…'
  discovery = (async () => {
    do {
      rediscover = false
      try {
        await discoverTests()
      } catch (error) {
        coc.window.showErrorMessage(`Failed to discover Go tests: ${String(error)}`)
        return
      }
      provider.refresh()
    } while (rediscover)
  })().finally(() => {
    discovery = undefined
    if (view) view.message = ''
  })
  return discovery
}

function ensureView(context: ExtensionContext): coc.TreeView<Node> {
  if (!view) {
    view = coc.window.createTreeView('go-test-explorer', { treeDataProvider: provider, bufhidden: 'hide', enableFilter: true })
    view.title = 'Go Tests'
    context.subscriptions.push(view)
  }
  return view
}

async function leaveTreeWindow(): Promise<void> {
  const { nvim } = coc.workspace
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

// ---------------------------------------------------------------------------
// Running
// ---------------------------------------------------------------------------

// Coalesces the refreshes that streaming results would otherwise trigger once
// per finished test, which would re-render the whole tree for each one.
function debouncedRefresh(): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined
  return () => {
    if (timer) return
    timer = setTimeout(() => {
      timer = undefined
      provider.refresh()
    }, 80)
  }
}

async function executeRun(ids: string[], dir: string, args: string[]): Promise<boolean> {
  for (const id of ids) runningIds.add(id)
  provider.refresh()
  const parser = new GoTestJsonParser()
  const refresh = debouncedRefresh()
  // A finished test updates its status in the view as it happens, rather than
  // all at once when the whole run ends.
  parser.onChange(() => {
    for (const result of parser.getTests()) {
      results.set(testKey(result.package, result.name), {
        outcome: result.outcome,
        elapsed: result.elapsed,
        output: result.output,
      })
    }
    refresh()
  })
  try {
    await runTestsCaptured(args, dir, line => parser.push(line))
    return parser.getTests().length > 0 || parser.getPackages().some(pkg => pkg.outcome === 'failed')
  } finally {
    for (const id of ids) runningIds.delete(id)
    provider.refresh()
  }
}

// Splits names into `-run` targets and benchmarks, which need `-bench` (with
// an empty `-run`) to actually execute.
function runArguments(names: string[]): string[] {
  const tests = names.filter(name => !isBenchmark(name)).map(escapeRegExp)
  const benchmarks = names.filter(isBenchmark).map(escapeRegExp)
  const args: string[] = []
  if (tests.length) args.push('-run', `^(${tests.join('|')})$`)
  else if (benchmarks.length) args.push('-run', '^$')
  if (benchmarks.length) args.push('-bench', `^(${benchmarks.join('|')})$`)
  return args
}

async function runTestNodes(nodes: TestNode[], dir: string): Promise<boolean> {
  return executeRun(nodes.map(node => testId(node.importPath, node.name)), dir, runArguments(nodes.map(node => node.name)))
}

async function runTest(node: TestNode): Promise<void> {
  const ok = await runTestNodes([node], node.dir)
  if (!ok) coc.window.showWarningMessage(`No results for ${node.name}.`)
}

async function runSubtest(node: SubtestNode): Promise<void> {
  const segments = node.path.split('/').map(escapeRegExp)
  await executeRun([testId(node.importPath, topTest(node).name)], node.dir, ['-run', `^${segments.join('/')}$`])
}

async function runFile(node: FileNode): Promise<void> {
  await runTestNodes(node.tests, node.dir)
}

async function runPackage(node: PackageNode): Promise<void> {
  await runTestNodes(testsUnder(node), node.dir)
}

async function runFolder(node: FolderNode): Promise<void> {
  for (const pkg of node.packages) await runPackage(pkg)
}

async function runNode(node: Node): Promise<void> {
  if (node.kind === 'test') await runTest(node)
  else if (node.kind === 'subtest') await runSubtest(node)
  else if (node.kind === 'file') await runFile(node)
  else if (node.kind === 'package') await runPackage(node)
  else await runFolder(node)
}

async function runPackageOf(node: Node): Promise<void> {
  if (node.kind !== 'test' && node.kind !== 'subtest') return
  const pkg = packageNodes.get(packageKey(node.importPath))
  if (pkg) await runPackage(pkg)
}

function resultOf(node: TestNode | SubtestNode): { outcome: Outcome, elapsed: number, output: string[] } | undefined {
  const key = node.kind === 'test' ? testKey(node.importPath, node.name) : testKey(node.importPath, node.path)
  return results.get(key)
}

function testTooltip(node: TestNode | SubtestNode): MarkupContent {
  const test = node.kind === 'test' ? node : topTest(node)
  const status = node.kind === 'test' ? testStatus(node) : subtestStatus(node)
  const result = resultOf(node)
  const lines = [test.file ? `\`${test.file}:${test.line}\`` : 'Location unknown.']
  if (status === 'running') lines.push('Running…')
  else if (result) lines.push(`${status} in ${result.elapsed.toFixed(2)}s`)
  if (result?.output.length) lines.push(`\`\`\`\n${result.output.join('\n')}\n\`\`\``)
  return { kind: coc.MarkupKind.Markdown, value: lines.join('\n\n') }
}

async function openNode(node: Node): Promise<void> {
  if (node.kind === 'package' || node.kind === 'folder') {
    coc.window.showWarningMessage('Only files, tests, and subtests can be located.')
    return
  }
  if (node.kind === 'file') {
    if (!node.file) {
      coc.window.showWarningMessage(`Could not locate ${node.name}.`)
      return
    }
    await leaveTreeWindow()
    await coc.workspace.jumpTo(coc.Uri.file(node.file).toString(), coc.Position.create(0, 0))
    return
  }
  const test = node.kind === 'test' ? node : topTest(node)
  if (!test.file) {
    coc.window.showWarningMessage(`Could not locate ${test.name}.`)
    return
  }
  let line = test.line
  if (node.kind === 'subtest') line = await subtestLine(node) ?? line
  await leaveTreeWindow()
  await coc.workspace.jumpTo(coc.Uri.file(test.file).toString(), coc.Position.create(line - 1, 0))
}

async function subtestLine(node: SubtestNode): Promise<number | undefined> {
  try {
    const lines = (await readFile(topTest(node).file, 'utf8')).split(/\r?\n/)
    const pattern = new RegExp(`\\bRun\\s*\\(\\s*["\`]${escapeRegExp(node.name)}["\`]`)
    const index = lines.findIndex(line => pattern.test(line))
    return index === -1 ? undefined : index + 1
  } catch {
    return undefined
  }
}

// ---------------------------------------------------------------------------
// Highlights
// ---------------------------------------------------------------------------

const iconHighlights: Array<[string, string[]]> = [
  ['CocGoTestPassed', ['DiagnosticOk', 'CocSuccess', 'String', 'MoreMsg']],
  ['CocGoTestFailed', ['DiagnosticError', 'CocErrorSign', 'ErrorMsg']],
  ['CocGoTestRunning', ['DiagnosticWarn', 'CocWarningSign', 'Special', 'WarningMsg']],
  ['CocGoTestSkipped', ['DiagnosticInfo', 'CocInfoSign', 'Comment', 'NonText']],
]

async function ensureHighlights(): Promise<void> {
  const { nvim } = coc.workspace
  for (const [group, targets] of iconHighlights) {
    if (Number(await nvim.call('hlexists', [group]))) continue
    for (const target of targets) {
      if (Number(await nvim.call('hlexists', [target]))) {
        await nvim.command(`highlight default link ${group} ${target}`)
        break
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

export function registerTestExplorerCommands(context: ExtensionContext): void {
  registerCommand(context, 'go.test.explorer.show', async () => {
    await ensureHighlights()
    const created = ensureView(context)
    await created.show()
    // Open the view immediately and discover in the background; the tree fills
    // in once `go list` and `go test -list` have run.
    void scheduleDiscovery()
  })

  registerCommand(context, 'go.test.explorer.refresh', async () => {
    if (!view) return
    await scheduleDiscovery()
  })

  registerCommand(context, 'go.test.explorer.run', async (node?: Node) => {
    const target = node ?? view?.selection[0]
    if (!target) {
      coc.window.showWarningMessage('Select a test in the Go Tests view first.')
      return
    }
    await runNode(target)
  })

  registerCommand(context, 'go.test.explorer.open', async (node?: Node) => {
    const target = node ?? view?.selection[0]
    if (target) await openNode(target)
  })

  registerCommand(context, 'go.test.explorer.runAll', async () => {
    await scheduleDiscovery()
    for (const node of topLevel) await runNode(node)
    provider.refresh()
  })

  context.subscriptions.push(coc.workspace.onDidSaveTextDocument(async (document) => {
    if (!view || !document.uri.endsWith('_test.go')) return
    void scheduleDiscovery()
  }))
}
