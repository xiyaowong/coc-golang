import type { ExtensionContext, TreeItem, TreeItemAction } from 'coc.nvim'
import type { Dirent } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import { basename, dirname, join, relative, sep } from 'node:path'
import * as coc from 'coc.nvim'
import { workspaceDirectories } from '../editor'
import { escapeRegExp, parseTestResults, testFunctions } from '../go-test-utils'
import { runTestsCaptured } from '../run-tests'
import { registerCommand } from './index'

type Outcome = 'passed' | 'failed' | 'skipped'
type Status = Outcome | 'running'

interface FolderNode {
  kind: 'folder'
  id: string
  dir: string
  packages: PackageNode[]
}

interface PackageNode {
  kind: 'package'
  id: string
  dir: string
  folder: string
  tests: TestNode[]
}

interface TestNode {
  kind: 'test'
  id: string
  name: string
  file: string
  line: number
  dir: string
  folder: string
}

interface SubtestNode {
  kind: 'subtest'
  id: string
  name: string
  path: string
  dir: string
  parent: TestNode | SubtestNode
}

type Node = FolderNode | PackageNode | TestNode | SubtestNode

const folderId = (dir: string): string => `folder:${dir}`
const packageId = (dir: string): string => `package:${dir}`
const testId = (dir: string, name: string): string => `test:${dir}|${name}`
const subtestId = (dir: string, path: string): string => `subtest:${dir}|${path}`

// Status of the last run, keyed by `package directory|test name`. Kept between
// runs so a partial run (a single test) does not clear the other results.
const results = new Map<string, Outcome>()
// Output of the last run for each test, so a failure's message can be shown.
const testOutput = new Map<string, string[]>()
const runningIds = new Set<string>()

const folderNodes = new Map<string, FolderNode>()
const packageNodes = new Map<string, PackageNode>()
const testNodes = new Map<string, TestNode>()
const subtestNodes = new Map<string, SubtestNode>()

interface TestFile {
  file: string
  dir: string
  functions: ReturnType<typeof testFunctions>
}

let folderDirs: string[] = []
let topLevel: Node[] = []

// The status word is redundant with the icon, which carries the meaning, so the
// icon is the only visual status; `applyStatus` sets it and nothing else.
const statusIcons: Record<Status, coc.TreeItemIcon> = {
  passed: { text: '✓', hlGroup: 'CocGoTestPassed' },
  failed: { text: '✗', hlGroup: 'CocGoTestFailed' },
  running: { text: '●', hlGroup: 'CocGoTestRunning' },
  skipped: { text: '○', hlGroup: 'CocGoTestSkipped' },
}

function cached<T>(map: Map<string, T>, id: string, create: () => T): T {
  let node = map.get(id)
  if (!node) {
    node = create()
    map.set(id, node)
  }
  return node
}

function within(dir: string, folder: string): boolean {
  return dir === folder || dir.startsWith(folder + sep)
}

function folderFor(dir: string): string {
  let best: string | undefined
  for (const folder of folderDirs) {
    if (within(dir, folder) && (!best || folder.length > best.length)) best = folder
  }
  return best ?? dirname(dir)
}

function byName(a: TestNode, b: TestNode): number {
  return a.name.localeCompare(b.name)
}

function topTest(node: SubtestNode): TestNode {
  let current: TestNode | SubtestNode = node
  while (current.kind === 'subtest') current = current.parent
  return current
}

// ---------------------------------------------------------------------------
// Tree data
// ---------------------------------------------------------------------------

function subtestChildren(dir: string, parentPath: string, parent: TestNode | SubtestNode): SubtestNode[] {
  const prefix = `${dir}|${parentPath}/`
  const names = new Set<string>()
  for (const key of results.keys()) {
    if (!key.startsWith(prefix)) continue
    const name = key.slice(prefix.length).split('/')[0]
    if (name) names.add(name)
  }
  return [...names].sort().map((name) => {
    const path = `${parentPath}/${name}`
    return cached(subtestNodes, subtestId(dir, path), () => ({
      kind: 'subtest',
      id: subtestId(dir, path),
      name,
      path,
      dir,
      parent,
    }))
  })
}

function subtestStatus(node: SubtestNode): Status | undefined {
  if (runningIds.has(node.id) || runningIds.has(topTest(node).id)) return 'running'
  return results.get(`${node.dir}|${node.path}`)
}

function testStatus(node: TestNode): Status | undefined {
  if (runningIds.has(node.id)) return 'running'
  const self = results.get(`${node.dir}|${node.name}`)
  const prefix = `${node.dir}|${node.name}/`
  let passed = false
  let skipped = false
  for (const [key, outcome] of results) {
    if (!key.startsWith(prefix)) continue
    if (outcome === 'failed') return 'failed'
    if (outcome === 'passed') passed = true
    else skipped = true
  }
  if (self) return self
  if (passed) return 'passed'
  return skipped ? 'skipped' : undefined
}

function aggregateStatus(statuses: Array<Status | undefined>): Status | undefined {
  for (const wanted of ['running', 'failed', 'passed', 'skipped'] as const) {
    if (statuses.includes(wanted)) return wanted
  }
  return undefined
}

function packageStatus(node: PackageNode): Status | undefined {
  return aggregateStatus(node.tests.map(testStatus))
}

function summary(statuses: Array<Status | undefined>): string {
  const count = (status: Status) => statuses.filter(item => item === status).length
  const parts: string[] = []
  for (const [status, label] of [['failed', 'failed'], ['running', 'running'], ['passed', 'passed']] as const) {
    const total = count(status)
    if (total) parts.push(`${total} ${label}`)
  }
  return parts.join(' · ')
}

function applyStatus(item: TreeItem, status: Status | undefined): void {
  if (status) item.icon = statusIcons[status]
}

// ---------------------------------------------------------------------------
// Discovery
// ---------------------------------------------------------------------------

// Directories that never hold hand-written tests and would only slow the walk.
const skippedDirectories = new Set(['.git', 'node_modules', 'vendor', 'testdata'])

async function collectTestFiles(directory: string, files: TestFile[], seen: Set<string>): Promise<void> {
  let entries: Dirent[]
  try {
    entries = await readdir(directory, { withFileTypes: true })
  } catch {
    return
  }
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      if (skippedDirectories.has(entry.name) || seen.has(path)) continue
      seen.add(path)
      await collectTestFiles(path, files, seen)
    } else if (entry.isFile() && entry.name.endsWith('_test.go')) {
      let lines: string[]
      try {
        lines = (await readFile(path, 'utf8')).split(/\r?\n/)
      } catch {
        continue
      }
      const functions = testFunctions(lines)
      if (functions.length) files.push({ file: path, dir: directory, functions })
    }
  }
}

async function discoverTests(): Promise<void> {
  folderDirs = workspaceDirectories()
  const files: TestFile[] = []
  const seen = new Set<string>()
  for (const directory of folderDirs) await collectTestFiles(directory, files, seen)
  rebuild(files)
}

function rebuild(files: TestFile[]): void {
  for (const node of folderNodes.values()) node.packages = []

  const packages = new Map<string, PackageNode>()
  for (const info of files) {
    const id = packageId(info.dir)
    const pkg = cached(packageNodes, id, () => ({
      kind: 'package' as const,
      id,
      dir: info.dir,
      folder: folderFor(info.dir),
      tests: [],
    }))
    pkg.folder = folderFor(info.dir)
    pkg.tests = info.functions.map((fn) => {
      const testIdentifier = testId(info.dir, fn.name)
      const test = cached(testNodes, testIdentifier, () => ({
        kind: 'test' as const,
        id: testIdentifier,
        name: fn.name,
        file: info.file,
        line: fn.line,
        dir: info.dir,
        folder: pkg.folder,
      }))
      test.name = fn.name
      test.file = info.file
      test.line = fn.line
      test.folder = pkg.folder
      return test
    }).sort(byName)
    packages.set(info.dir, pkg)
  }

  const all = [...packages.values()].sort((a, b) => a.dir.localeCompare(b.dir))
  for (const pkg of all) {
    const folder = cached(folderNodes, folderId(pkg.folder), () => ({
      kind: 'folder' as const,
      id: folderId(pkg.folder),
      dir: pkg.folder,
      packages: [],
    }))
    folder.packages.push(pkg)
  }

  // A single workspace folder is the implicit root, so its packages are the
  // top level and the folder node itself is only needed for multiple folders.
  if (folderDirs.length <= 1) {
    const folder = folderDirs[0] && folderNodes.get(folderId(folderDirs[0]))
    topLevel = folder ? folder.packages : all
  } else {
    topLevel = folderDirs
      .map(dir => folderNodes.get(folderId(dir)))
      .filter((node): node is FolderNode => node !== undefined)
  }
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
        item.description = summary(element.packages.map(packageStatus))
        return item
      }
      case 'package': {
        const label = relative(element.folder, element.dir).replace(/\\/g, '/') || '.'
        const item = new coc.TreeItem(label, coc.TreeItemCollapsibleState.Expanded)
        item.tooltip = element.dir
        item.description = summary(element.tests.map(testStatus))
        applyStatus(item, packageStatus(element))
        return item
      }
      case 'test': {
        const children = subtestChildren(element.dir, element.name, element)
        const item = new coc.TreeItem(element.name, children.length ? coc.TreeItemCollapsibleState.Expanded : coc.TreeItemCollapsibleState.None)
        item.tooltip = testTooltip(element)
        applyStatus(item, testStatus(element))
        item.command = { title: 'Run Go Test', command: 'go.test.explorer.run', arguments: [element] }
        return item
      }
      case 'subtest': {
        const children = subtestChildren(element.dir, element.path, element)
        const item = new coc.TreeItem(element.name, children.length ? coc.TreeItemCollapsibleState.Expanded : coc.TreeItemCollapsibleState.None)
        item.tooltip = testTooltip(element)
        applyStatus(item, subtestStatus(element))
        item.command = { title: 'Run Go Subtest', command: 'go.test.explorer.run', arguments: [element] }
        return item
      }
    }
  }

  getChildren(element?: Node): Node[] {
    if (!element) return topLevel
    switch (element.kind) {
      case 'folder': return element.packages
      case 'package': return element.tests
      case 'test': return subtestChildren(element.dir, element.name, element)
      case 'subtest': return subtestChildren(element.dir, element.path, element)
    }
  }

  getParent(element: Node): Node | undefined {
    switch (element.kind) {
      case 'folder': return undefined
      case 'package': return folderDirs.length > 1 ? folderNodes.get(folderId(element.folder)) : undefined
      case 'test': return packageNodes.get(packageId(element.dir))
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
    if (element.kind === 'package') {
      return [{ title: 'Run Package Tests', handler: node => runNode(node) }]
    }
    return [{ title: 'Run Tests in Folder', handler: node => runNode(node) }]
  }
}

const provider = new TestDataProvider()
let view: coc.TreeView<Node> | undefined

function ensureView(context: ExtensionContext): coc.TreeView<Node> {
  if (!view) {
    // `bufhidden: hide` keeps the view buffer alive when its window closes, so
    // the view is reused instead of being disposed and re-created on every open.
    view = coc.window.createTreeView('go-test-explorer', { treeDataProvider: provider, bufhidden: 'hide' })
    view.title = 'Go Tests'
    context.subscriptions.push(view)
  }
  return view
}

// A tree command runs with the tree window focused; opening a file there would
// replace the tree. Move to another window first when that is the case.
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

async function executeRun(ids: string[], dir: string, args: string[]): Promise<void> {
  for (const id of ids) runningIds.add(id)
  provider.refresh()
  try {
    const { output } = await runTestsCaptured(args, dir)
    for (const { name, outcome, output: messages } of parseTestResults(output)) {
      const key = `${dir}|${name}`
      results.set(key, outcome)
      testOutput.set(key, messages)
    }
  } finally {
    for (const id of ids) runningIds.delete(id)
    provider.refresh()
  }
}

async function runTest(node: TestNode): Promise<void> {
  await executeRun([node.id], node.dir, ['-run', `^${escapeRegExp(node.name)}$`, '-v'])
}

async function runSubtest(node: SubtestNode): Promise<void> {
  const pattern = node.path.split('/').map(segment => `^${escapeRegExp(segment)}$`).join('/')
  await executeRun([topTest(node).id], node.dir, ['-run', pattern, '-v'])
}

async function runPackage(node: PackageNode): Promise<void> {
  await executeRun(node.tests.map(test => test.id), node.dir, ['-v'])
}

async function runFolder(node: FolderNode): Promise<void> {
  for (const pkg of node.packages) await runPackage(pkg)
}

async function runNode(node: Node): Promise<void> {
  if (node.kind === 'test') await runTest(node)
  else if (node.kind === 'subtest') await runSubtest(node)
  else if (node.kind === 'package') await runPackage(node)
  else await runFolder(node)
}

async function runPackageOf(node: Node): Promise<void> {
  if (node.kind !== 'test' && node.kind !== 'subtest') return
  const pkg = packageNodes.get(packageId(node.dir))
  if (pkg) await runPackage(pkg)
}

function outputOf(node: TestNode | SubtestNode): string[] {
  const name = node.kind === 'test' ? node.name : node.path
  return testOutput.get(`${node.dir}|${name}`) ?? []
}

// A subtest's own log lines; its parent's output includes everything the
// subtest wrote, so the shared lines are dropped from the subtest's message.
function selfOutput(node: SubtestNode): string[] {
  const mine = new Set(outputOf(node))
  return outputOf(node.parent).filter(line => mine.has(line))
}

// The tooltip shows where the test is defined, and for a failed test the output
// that made it fail. Markdown keeps the failure message in a fenced block.
function testTooltip(node: TestNode | SubtestNode): coc.MarkupContent {
  const test = node.kind === 'test' ? node : topTest(node)
  const lines = [`\`${test.file}:${test.line}\``]
  const status = node.kind === 'test' ? testStatus(node) : subtestStatus(node)
  if (status === 'failed') {
    const output = node.kind === 'test' ? outputOf(node) : selfOutput(node)
    lines.push(output.length ? `\`\`\`\n${output.join('\n')}\n\`\`\`` : 'No output recorded for this failure.')
  }
  return { kind: coc.MarkupKind.Markdown, value: lines.join('\n\n') }
}

async function openNode(node: Node): Promise<void> {
  if (node.kind === 'package' || node.kind === 'folder') {
    coc.window.showWarningMessage('Only tests and subtests can be located.')
    return
  }
  const test = node.kind === 'test' ? node : topTest(node)
  let line = test.line
  if (node.kind === 'subtest') line = await subtestLine(node) ?? line
  await leaveTreeWindow()
  await coc.workspace.jumpTo(coc.Uri.file(test.file).toString(), coc.Position.create(line - 1, 0))
}

// The line of the `t.Run("name", ...)` call, so a subtest can be located rather
// than only its parent test.
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

// The status icons are plain glyphs; their colours come from the diagnostic
// highlight groups when the colourscheme provides them.
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
    await discoverTests()
    const created = ensureView(context)
    await created.show()
    provider.refresh()
  })

  registerCommand(context, 'go.test.explorer.refresh', async () => {
    if (!view) return
    await discoverTests()
    provider.refresh()
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
    await discoverTests()
    for (const dir of folderDirs) {
      const folder = folderNodes.get(folderId(dir))
      if (folder) await runFolder(folder)
    }
    provider.refresh()
  })

  // Keep newly added or removed tests in sync with the tree.
  context.subscriptions.push(coc.workspace.onDidSaveTextDocument(async (document) => {
    if (!view || !document.uri.endsWith('_test.go')) return
    await discoverTests()
    provider.refresh()
  }))
}
