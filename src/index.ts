import { execFile, spawn } from 'node:child_process'
import { accessSync, constants, existsSync, readFileSync } from 'node:fs'
import { delimiter, dirname, isAbsolute, join } from 'node:path'
import { devNull, homedir, platform } from 'node:os'
import { fileURLToPath, pathToFileURL } from 'node:url'
import * as coc from 'coc.nvim'
import type { ChildProcess } from 'node:child_process'
import type { Disposable, ExtensionContext, LanguageClient } from 'coc.nvim'
import { lintArguments, parseProblems } from './go-check-utils'
import {
  buildFlagsWithTags,
  goplsConfiguration,
  inferGopath,
  parseEnvFile,
  pathKey,
  prependPath,
  testFlagsFor
} from './go-config-utils'
import type { GoplsOptions } from './go-config-utils'
import { testArgumentsAtCursor, testArgumentsForFile, testNameAtCursor } from './go-test-utils'

const restartSettings = [
  'go.useLanguageServer',
  'go.languageServerFlags',
  'go.goplsUseDaemon',
  'go.disable',
  'go.alternateTools',
  'go.goroot',
  'go.gopath',
  'go.inferGopath',
  'go.toolsGopath',
  'go.toolsEnvVars',
  'go.buildFlags',
  'go.buildTags',
  'go.inlayHints',
  'go.diagnostic.vulncheck',
  'go.enableCodeLens',
  'gopls'
]

type ToolDefinition = { module: string; binary?: string; optional?: boolean }

const tools: Record<string, ToolDefinition> = {
  gopls: { module: 'golang.org/x/tools/gopls@latest' },
  dlv: { module: 'github.com/go-delve/delve/cmd/dlv@latest' },
  goimports: { module: 'golang.org/x/tools/cmd/goimports@latest' },
  staticcheck: { module: 'honnef.co/go/tools/cmd/staticcheck@latest' },
  govulncheck: { module: 'golang.org/x/vuln/cmd/govulncheck@latest' },
  gomodifytags: { module: 'github.com/fatih/gomodifytags@latest' },
  gotests: { module: 'github.com/cweill/gotests/gotests@latest' },
  impl: { module: 'github.com/josharian/impl@latest' },
  golint: { module: 'golang.org/x/lint/golint@latest', optional: true },
  'golangci-lint': {
    module: 'github.com/golangci/golangci-lint/cmd/golangci-lint@latest',
    binary: 'golangci-lint',
    optional: true
  },
  'golangci-lint-v2': {
    module: 'github.com/golangci/golangci-lint/v2/cmd/golangci-lint@latest',
    binary: 'golangci-lint',
    optional: true
  },
  revive: { module: 'github.com/mgechev/revive@latest', optional: true },
  gofumpt: { module: 'mvdan.cc/gofumpt@latest', optional: true },
  goformat: { module: 'winterdrache.de/goformat/goformat@latest', optional: true }
}
type ToolName = string

type ProcessResult = {
  code: number | null
  stdout: string
  output: string
}

type CheckKind = 'build' | 'vet' | 'lint'
type CheckScope = 'file' | 'package' | 'workspace'

let client: LanguageClient | undefined
let clientRegistration: Disposable | undefined
let formatRegistration: Disposable | undefined
let runningProcesses = new Set<ChildProcess>()
let runningTests = new Set<ChildProcess>()
let outputChannel: coc.OutputChannel | undefined
let previousTest: { args: string[]; cwd: string } | undefined
const checkCollections = new Map<string, coc.DiagnosticCollection>()
const terminalEnvironmentBackup = new Map<string, string | undefined>()

function configValue<T>(name: string, fallback: T): T {
  const value = coc.workspace.getConfiguration('go').get<T | null>(name)
  return value === undefined || value === null ? fallback : value
}

function alternateTool(name: string): string | undefined {
  const value = configValue<Record<string, string>>('alternateTools', {})[name]
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function goCommand(): string {
  return alternateTool('go') ?? 'go'
}

function toolsDirectories(environment: NodeJS.ProcessEnv): string[] {
  const directories: (string | undefined)[] = [
    environment.GOBIN,
    ...(environment.GOPATH || '').split(delimiter).filter(Boolean).map(item => join(item, 'bin'))
  ]
  const toolsGopath = configValue('toolsGopath', '')
  if (toolsGopath) directories.unshift(join(toolsGopath, 'bin'))
  return directories.filter((directory): directory is string => !!directory)
}

function goEnvironment(forToolInstall = false): NodeJS.ProcessEnv {
  const environment: NodeJS.ProcessEnv = {
    ...process.env,
    ...configValue<Record<string, string>>('toolsEnvVars', {})
  }
  const goroot = configValue('goroot', '')
  let gopath = configValue('gopath', '')
  if (configValue('inferGopath', false)) {
    const folder = workspaceDirectories()[0]
    if (folder && !existsSync(join(folder, 'go.mod'))) gopath = inferGopath(folder) ?? gopath
  }
  if (goroot) {
    environment.GOROOT = goroot
    prependPath(environment, join(goroot, 'bin'), delimiter)
  }
  if (gopath) environment.GOPATH = gopath
  const toolsGopath = configValue('toolsGopath', '')
  if (forToolInstall && toolsGopath) environment.GOPATH = toolsGopath
  return environment
}

function goBuildFlags(): string[] {
  return buildFlagsWithTags(configValue<string[]>('buildFlags', []), configValue('buildTags', ''))
}

function goTestFlags(): string[] {
  return testFlagsFor({
    testFlags: configValue<string[] | null>('testFlags', null),
    buildFlags: configValue<string[]>('buildFlags', []),
    testTags: configValue<string | null>('testTags', null),
    buildTags: configValue('buildTags', ''),
    testTimeout: configValue('testTimeout', '')
  })
}

function goTestEnvironment(): NodeJS.ProcessEnv {
  const environment: Record<string, string> = {}
  const envFile = configValue('testEnvFile', '')
  if (envFile) {
    try {
      Object.assign(environment, parseEnvFile(readFileSync(envFile, 'utf8')))
    } catch (error) {
      coc.window.showMessage(`Unable to read go.testEnvFile ${envFile}: ${String(error)}`, 'warning')
    }
  }
  return { ...environment, ...configValue<Record<string, string>>('testEnvVars', {}) }
}

function goplsOptions(): GoplsOptions {
  const go = coc.workspace.getConfiguration('go')
  const hints = go.get<Record<string, boolean>>('inlayHints', {})
  return goplsConfiguration(coc.workspace.getConfiguration().get<GoplsOptions>('gopls', {}), {
    buildFlags: configValue<string[]>('buildFlags', []),
    buildTags: configValue('buildTags', ''),
    inlayHints: Object.fromEntries(Object.entries(hints).filter(([, value]) => typeof value === 'boolean')),
    vulncheck: go.get<string>('diagnostic.vulncheck'),
    runTestCodeLens: go.get<{ runtest?: boolean }>('enableCodeLens', {}).runtest !== false
  })
}

// Mirrors the "go.terminal.activateEnvironment" setting by exporting the Go environment to Neovim.
async function activateTerminalEnvironment(): Promise<void> {
  for (const [name, value] of terminalEnvironmentBackup) {
    await coc.workspace.nvim.call('setenv', [name, value ?? null])
  }
  terminalEnvironmentBackup.clear()
  if (!configValue('terminal.activateEnvironment', true)) return

  const environment = goEnvironment()
  for (const name of Object.keys(environment)) {
    const value = environment[name]
    const original = process.env[name]
    if (value === undefined || value === original) continue
    terminalEnvironmentBackup.set(name, original)
    await coc.workspace.nvim.call('setenv', [name, value])
  }
}

function resolveExecutable(command: string, env: NodeJS.ProcessEnv = process.env): string | undefined {
  const expanded = command.startsWith('~') ? join(homedir(), command.slice(1)) : command
  if (isAbsolute(expanded) || expanded.includes('/') || expanded.includes('\\')) {
    const file = isAbsolute(expanded) ? expanded : join(coc.workspace.cwd, expanded)
    try {
      accessSync(file, constants.X_OK)
      return existsSync(file) ? file : undefined
    } catch {
      return undefined
    }
  }

  const extensions = platform() === 'win32'
    ? (process.env.PATHEXT || '.EXE;.CMD;.BAT').split(';')
    : ['']
  for (const directory of (env[pathKey(env)] || '').split(delimiter)) {
    for (const extension of extensions) {
      const candidate = join(directory, expanded + extension)
      try {
        accessSync(candidate, constants.X_OK)
        return candidate
      } catch {
        continue
      }
    }
  }
}

function runProcess(
  command: string,
  args: string[],
  cwd: string,
  env: NodeJS.ProcessEnv = process.env,
  processGroup?: Set<ChildProcess>,
  input?: string
): Promise<ProcessResult> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd,
      env,
      stdio: [input === undefined ? 'ignore' : 'pipe', 'pipe', 'pipe'],
      windowsHide: true
    })
    runningProcesses.add(child)
    processGroup?.add(child)
    let stdout = ''
    let output = ''
    child.stdout?.on('data', (chunk: Buffer) => {
      const value = chunk.toString()
      stdout += value
      output += value
      if (input === undefined) outputChannel?.append(value)
    })
    child.stderr?.on('data', (chunk: Buffer) => {
      const value = chunk.toString()
      output += value
      outputChannel?.append(value)
    })
    child.once('error', error => {
      runningProcesses.delete(child)
      processGroup?.delete(child)
      reject(error)
    })
    child.once('close', code => {
      runningProcesses.delete(child)
      processGroup?.delete(child)
      resolvePromise({ code, stdout, output })
    })
    if (input !== undefined) {
      child.stdin?.on('error', () => undefined)
      child.stdin?.end(input)
    }
  })
}

function showCommandOutput(title: string): void {
  outputChannel?.appendLine(`\n> ${title}`)
  outputChannel?.show()
}

async function runGo(
  subcommand: string,
  args: string[],
  cwd: string,
  testProcess = false,
  extraEnvironment: NodeJS.ProcessEnv = {}
): Promise<ProcessResult | undefined> {
  const fullArgs = [subcommand, ...args]
  showCommandOutput(`${goCommand()} ${fullArgs.join(' ')}`)
  try {
    const result = await runProcess(
      goCommand(),
      fullArgs,
      cwd,
      { ...goEnvironment(), ...extraEnvironment },
      testProcess ? runningTests : undefined
    )
    if (result.code !== 0) {
      coc.window.showMessage(`go ${subcommand} exited with code ${result.code}`, 'error')
    }
    return result
  } catch (error) {
    coc.window.showMessage(`Failed to run go ${subcommand}: ${String(error)}`, 'error')
  }
}

async function activeFile(): Promise<string | undefined> {
  const file = await coc.workspace.nvim.eval('expand("%:p")')
  return typeof file === 'string' && file ? file : undefined
}

async function activeDirectory(): Promise<string> {
  const file = await activeFile()
  return file ? dirname(file) : coc.workspace.cwd
}

function workspaceDirectories(): string[] {
  const directories = coc.workspace.workspaceFolders
    .map(folder => {
      try {
        return fileURLToPath(folder.uri)
      } catch {
        return undefined
      }
    })
    .filter((directory): directory is string => directory !== undefined)
  return directories.length ? directories : [coc.workspace.cwd]
}

async function currentBufferLines(): Promise<string[]> {
  const lines = await coc.workspace.nvim.eval('getline(1, "$")')
  return Array.isArray(lines) ? lines.map(String) : []
}

function counterpartGoFile(file: string): string | undefined {
  if (!file.endsWith('.go')) return undefined
  return file.endsWith('_test.go')
    ? `${file.slice(0, -'_test.go'.length)}.go`
    : `${file.slice(0, -'.go'.length)}_test.go`
}

function fileUri(file: string): string {
  return pathToFileURL(file).href
}

async function runTests(
  args: string[],
  cwd: string
): Promise<void> {
  previousTest = { args, cwd }
  if (configValue('disableConcurrentTests', false)) {
    for (const process of runningTests) process.kill()
    runningTests.clear()
  }
  await runGo('test', [...goTestFlags(), ...args], cwd, true, goTestEnvironment())
}

async function showGoEnvironment(name?: string): Promise<void> {
  const args = name ? ['env', name] : ['env']
  showCommandOutput(`${goCommand()} ${args.join(' ')}`)
  try {
    const result = await runProcess(goCommand(), args, coc.workspace.cwd, goEnvironment())
    if (result.code !== 0) {
      coc.window.showMessage(`go env exited with code ${result.code}`, 'error')
    } else if (name) {
      coc.window.showMessage(`${name}: ${result.stdout.trim()}`, 'more')
    }
  } catch (error) {
    coc.window.showMessage(`Failed to run go env: ${String(error)}`, 'error')
  }
}

async function installTool(name: ToolName): Promise<boolean> {
  const command = configValue('toolsManagement.go', '') || goCommand()
  showCommandOutput(`${command} install ${tools[name].module}`)
  try {
    const result = await runProcess(
      command,
      ['install', tools[name].module],
      coc.workspace.cwd,
      goEnvironment(true)
    )
    if (result.code !== 0) {
      coc.window.showMessage(`Failed to install ${name} (exit code ${result.code}). See Go output.`, 'error')
      return false
    }
    coc.window.showMessage(`${name} installed successfully.`)
    return true
  } catch (error) {
    coc.window.showMessage(`Failed to install ${name}: ${String(error)}`, 'error')
    return false
  }
}

async function toolExecutable(name: string): Promise<string | undefined> {
  const env = goEnvironment()
  const configured = alternateTool(name) ?? tools[name]?.binary ?? name
  const found = resolveExecutable(configured, env)
  if (found || configured.includes('/') || configured.includes('\\')) return found

  const directories = toolsDirectories(env)
  if (!env.GOPATH && !configValue('toolsGopath', '')) {
    try {
      const gopath = (await execFileText(goCommand(), ['env', 'GOPATH'], env)).trim()
      directories.push(...gopath.split(delimiter).filter(Boolean).map(item => join(item, 'bin')))
    } catch {
      // The go command is unavailable; only PATH and explicit settings can be used.
    }
  }

  const extensions = platform() === 'win32'
    ? (process.env.PATHEXT || '.EXE;.CMD;.BAT').split(';')
    : ['']
  for (const directory of directories) {
    for (const extension of extensions) {
      const candidate = join(directory, configured + extension)
      try {
        accessSync(candidate, constants.X_OK)
        return candidate
      } catch {
        continue
      }
    }
  }
}

function execFileText(command: string, args: string[], env: NodeJS.ProcessEnv): Promise<string> {
  return new Promise((resolvePromise, reject) => {
    execFile(command, args, { env, windowsHide: true }, (error, stdout) => {
      if (error) reject(error)
      else resolvePromise(stdout)
    })
  })
}

async function runTool(
  name: ToolName,
  args: string[],
  cwd: string,
  options: { input?: string; quiet?: boolean } = {}
): Promise<ProcessResult | undefined> {
  let executable = await toolExecutable(name)
  if (!executable && configValue('autoInstallTools', false) && await coc.window.showPrompt(`${name} is missing. Install it now?`)) {
    if (await installTool(name)) executable = await toolExecutable(name)
  }
  if (!executable) {
    coc.window.showMessage(`The ${name} tool is not installed. Run :CocCommand go.tools.install.${name}.`, 'warning')
    return undefined
  }
  if (!options.quiet) showCommandOutput(`${executable} ${args.join(' ')}`)
  try {
    const result = await runProcess(executable, args, cwd, goEnvironment(), undefined, options.input)
    if (options.quiet) return result
    if (name === 'govulncheck' && result.code === 3) {
      coc.window.showMessage('govulncheck found vulnerabilities. See Go output.', 'warning')
    } else if (result.code !== 0) {
      coc.window.showMessage(`${name} exited with code ${result.code}`, 'error')
    }
    return result
  } catch (error) {
    coc.window.showMessage(`Failed to run ${name}: ${String(error)}`, 'error')
  }
}

function checkCollection(kind: CheckKind, tool?: string): coc.DiagnosticCollection {
  const name = kind === 'lint' ? `go-lint-${tool}` : `go-${kind}`
  let collection = checkCollections.get(name)
  if (!collection) {
    collection = coc.languages.createDiagnosticCollection(name)
    checkCollections.set(name, collection)
  }
  return collection
}

function lintTool(): string {
  return configValue('lintTool', '') || 'staticcheck'
}

async function runCheck(kind: CheckKind, scope: CheckScope, cwd: string, file?: string): Promise<void> {
  const target = scope === 'workspace' ? './...' : scope === 'file' && file ? file : '.'
  let result: ProcessResult | undefined
  let tool: string | undefined
  if (kind === 'lint') {
    tool = lintTool()
    const binary = tool
    showCommandOutput(`${binary} ${lintArguments(tool, configValue<string[]>('lintFlags', []), target).join(' ')}`)
    result = await runTool(
      binary,
      lintArguments(tool, configValue<string[]>('lintFlags', []), target),
      cwd,
      { quiet: true }
    )
  } else if (kind === 'vet') {
    result = await runGo('vet', [...goBuildFlags(), ...configValue<string[]>('vetFlags', []), target], cwd)
  } else {
    const flags = [...goBuildFlags()]
    if (configValue('installDependenciesWhenBuilding', false)) flags.unshift('-i')
    result = await runGo('build', [...flags, ...(scope === 'workspace' ? [] : ['-o', devNull]), target], cwd)
  }
  if (!result) return

  const collection = checkCollection(kind, tool)
  const problems = parseProblems(result.output, cwd)
  if (kind === 'lint') {
    if (result.code !== 0 && !problems.length) {
      coc.window.showMessage(`${tool} exited with code ${result.code}. See Go output.`, 'error')
    }
  }
  const severity = kind === 'build' ? coc.DiagnosticSeverity.Error : coc.DiagnosticSeverity.Warning
  const diagnostics = new Map<string, coc.Diagnostic[]>()
  for (const problem of problems) {
    const uri = fileUri(problem.file)
    const range = coc.Range.create(problem.line - 1, problem.column - 1, problem.line - 1, problem.column - 1)
    const list = diagnostics.get(uri) ?? []
    list.push(coc.Diagnostic.create(range, problem.message, severity, undefined, tool ?? `go ${kind}`))
    diagnostics.set(uri, list)
  }
  collection.clear()
  collection.set([...diagnostics.entries()])
}

function registerCommand(
  context: ExtensionContext,
  id: string,
  callback: (...args: any[]) => unknown
): void {
  context.subscriptions.push(coc.commands.registerCommand(id, callback))
}

function registerCommands(context: ExtensionContext): void {
  const cwd = activeDirectory
  registerCommand(context, 'go.test.package', async () => runTests([], await cwd()))
  registerCommand(context, 'go.test.explorer', async () => {
    const directory = await cwd()
    showCommandOutput(`${goCommand()} test -list .`)
    try {
      const result = await runProcess(goCommand(), ['test', '-list', '.'], directory, goEnvironment())
      const names = result.stdout.split(/\r?\n/).filter(name =>
        /^(?:Test[A-Z0-9]\w*|Benchmark[A-Z0-9]\w*|Example(?:[A-Z]\w*|_[a-z]\w*)?)$/.test(name)
      )
      if (result.code !== 0) {
        coc.window.showMessage(`go test -list exited with code ${result.code}`, 'error')
        return
      }
      if (!names.length) {
        coc.window.showMessage('No Go tests, examples, or benchmarks found in this package.', 'warning')
        return
      }
      const selected = await coc.window.showQuickpick(names, 'Select a Go test or benchmark')
      if (selected < 0 || selected >= names.length) return
      const name = names[selected]
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const args = name.startsWith('Benchmark')
        ? ['-run', '^$', '-bench', `^${escaped}$`, ...configValue<string[]>('benchmarkFlags', [])]
        : ['-run', `^${escaped}$`]
      await runTests(args, directory)
    } catch (error) {
      coc.window.showMessage(`Failed to list Go tests: ${String(error)}`, 'error')
    }
  })
  registerCommand(context, 'go.test.workspace', async () => {
    for (const directory of workspaceDirectories()) await runTests(['./...'], directory)
  })
  registerCommand(context, 'go.test.file', async () => {
    const args = testArgumentsForFile(await currentBufferLines())
    if (!args) {
      coc.window.showMessage('No Go tests or examples found in the current file.', 'warning')
      return
    }
    await runTests(args, await cwd())
  })
  registerCommand(context, 'go.test.cursor', async () => {
    const lines = await coc.workspace.nvim.eval('getline(1, line("."))')
    const args = testArgumentsAtCursor(lines as string[] | string)
    if (!args) {
      coc.window.showMessage('No Go test, benchmark, or example found at the cursor.', 'warning')
      return
    }
    await runTests(args, await cwd())
  })
  registerCommand(context, 'go.test.cursorOrPrevious', async () => {
    const lines = await coc.workspace.nvim.eval('getline(1, line("."))')
    const args = testArgumentsAtCursor(lines as string[] | string)
    if (args) {
      await runTests(args, await cwd())
      return
    }
    await coc.commands.executeCommand('go.test.previous')
  })
  registerCommand(context, 'go.subtest.cursor', async () => {
    const lines = await coc.workspace.nvim.eval('getline(1, line("."))')
    const testName = testNameAtCursor(lines as string[] | string)
    const subtestName = await coc.workspace.nvim.eval('expand("<cword>")') as string
    if (!testName || !subtestName) {
      coc.window.showMessage('Place the cursor on a subtest inside a Go test function.', 'warning')
      return
    }
    const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    await runTests(['-run', `^${escape(testName)}$/${escape(subtestName)}$`], await cwd())
  })
  registerCommand(context, 'go.test.previous', async () => {
    if (!previousTest) {
      coc.window.showMessage('No previous Go test command.', 'warning')
      return
    }
    await runTests(previousTest.args, previousTest.cwd)
  })
  registerCommand(context, 'go.test.coverage', async () => runTests(['-cover'], await cwd()))
  registerCommand(context, 'go.toggle.test.file', async () => {
    const file = await activeFile()
    const target = file ? counterpartGoFile(file) : undefined
    if (!target) {
      coc.window.showMessage('Open a Go file first.', 'warning')
      return
    }
    await coc.workspace.openResource(fileUri(target))
  })
  registerCommand(context, 'go.benchmark.package', async () =>
    runTests(['-run', '^$', '-bench', '.', ...configValue<string[]>('benchmarkFlags', [])], await cwd()))
  registerCommand(context, 'go.benchmark.cursor', async () => {
    const lines = await coc.workspace.nvim.eval('getline(1, line("."))')
    const args = testArgumentsAtCursor(lines as string[] | string)
    if (!args?.includes('-bench')) {
      coc.window.showMessage('No Go benchmark found at the cursor.', 'warning')
      return
    }
    await runTests([...args, ...configValue<string[]>('benchmarkFlags', [])], await cwd())
  })
  registerCommand(context, 'go.benchmark.file', async () => {
    const args = testArgumentsForFile(await currentBufferLines(), true)
    if (!args) {
      coc.window.showMessage('No Go benchmarks found in the current file.', 'warning')
      return
    }
    await runTests([...args, ...configValue<string[]>('benchmarkFlags', [])], await cwd())
  })

  const packageCommand = (id: string, subcommand: string, args: string[] = ['.']): void => {
    registerCommand(context, id, async () => {
      await runGo(subcommand, args, await cwd())
    })
  }
  registerCommand(context, 'go.build.package', async () => runCheck('build', 'package', await cwd()))
  registerCommand(context, 'go.vet.package', async () => runCheck('vet', 'package', await cwd()))
  packageCommand('go.generate.package', 'generate')
  packageCommand('go.mod.tidy', 'mod', ['tidy'])
  packageCommand('go.mod.vendor', 'mod', ['vendor'])
  packageCommand('go.work.sync', 'work', ['sync'])
  registerCommand(context, 'go.run', async (target?: string) =>
    runGo('run', [...goBuildFlags(), target || '.'], await cwd()))
  for (const [id, kind] of [
    ['go.build.workspace', 'build'],
    ['go.vet.workspace', 'vet']
  ] as const) {
    registerCommand(context, id, async () => {
      for (const directory of workspaceDirectories()) await runCheck(kind, 'workspace', directory)
    })
  }
  registerCommand(context, 'go.lint.package', async () => runCheck('lint', 'package', await cwd()))
  registerCommand(context, 'go.lint.workspace', async () => {
    await Promise.all(workspaceDirectories().map(directory => runCheck('lint', 'workspace', directory)))
  })

  registerCommand(context, 'go.vulncheck.package', async () =>
    runTool('govulncheck', ['.'], await cwd()))
  registerCommand(context, 'go.vulncheck.workspace', async () => {
    for (const directory of workspaceDirectories()) await runTool('govulncheck', ['./...'], directory)
  })
  registerCommand(context, 'go.vulncheck.toggle', async () => {
    const config = coc.workspace.getConfiguration('go')
    const vulncheck = config.get<string>('diagnostic.vulncheck', 'Prompt') === 'Imports' ? 'Off' : 'Imports'
    await config.update('diagnostic.vulncheck', vulncheck, true)
    coc.window.showMessage(`gopls vulncheck: ${vulncheck}`)
  })

  registerCommand(context, 'go.fmt.package', async () =>
    runGo('fmt', ['.'], await cwd()))
  registerCommand(context, 'go.import.organize', async () => {
    await coc.commands.executeCommand('editor.action.organizeImport')
  })
  registerCommand(context, 'go.import.add', async (importPath?: string) => {
    const file = await activeFile()
    if (!file?.endsWith('.go')) {
      coc.window.showMessage('Open a Go file first.', 'warning')
      return
    }
    if (!client) {
      coc.window.showMessage('gopls is not running.', 'warning')
      return
    }
    const uri = fileUri(file)
    let pkg = typeof importPath === 'string' ? importPath.trim() : ''
    if (!pkg) {
      let packages: string[] = []
      try {
        const result = await client.sendRequest<{ Packages?: string[] }>('workspace/executeCommand', {
          command: 'gopls.list_known_packages',
          arguments: [{ URI: uri }]
        })
        packages = result?.Packages?.filter(Boolean) ?? []
      } catch {
        packages = []
      }
      if (packages.length) {
        const selected = await coc.window.showQuickpick(packages, 'Select a package to import')
        if (selected < 0 || selected >= packages.length) return
        pkg = packages[selected]
      } else {
        pkg = (await coc.window.requestInput('Import path'))?.trim() ?? ''
      }
    }
    if (!pkg) return
    try {
      await client.sendRequest('workspace/executeCommand', {
        command: 'gopls.add_import',
        arguments: [{ ImportPath: pkg, URI: uri }]
      })
    } catch (error) {
      coc.window.showMessage(`Failed to add import: ${String(error)}`, 'error')
    }
  })
  registerCommand(context, 'go.mod.init', async (modulePath?: string) => {
    modulePath ??= await coc.window.requestInput('Module path (e.g. example.com/project)')
    if (!modulePath) return
    await runGo('mod', ['init', modulePath], await cwd())
  })
  registerCommand(context, 'go.get.package', async (packagePath?: string) => {
    packagePath ??= await coc.window.requestInput('Go module or package path')
    if (!packagePath) return
    await runGo('get', [packagePath], await cwd())
  })
  registerCommand(context, 'go.install.package', async (packagePath?: string) => {
    packagePath ??= await coc.window.requestInput('Go package path')
    if (!packagePath) return
    await runGo('install', [...goBuildFlags(), packagePath], await cwd())
  })
  registerCommand(context, 'go.gopath', () => showGoEnvironment('GOPATH'))
  registerCommand(context, 'go.goroot', () => showGoEnvironment('GOROOT'))
  registerCommand(context, 'go.environment.choose', async () => {
    const current = configValue('goroot', '')
    const value = await coc.window.requestInput('GOROOT to use (empty to use Go default)', current)
    if (value === undefined) return
    await coc.workspace.getConfiguration('go').update('goroot', value || undefined, true)
  })
  registerCommand(context, 'go.env', () => showGoEnvironment())
  registerCommand(context, 'go.version', async () => {
    showCommandOutput(`${goCommand()} version`)
    try {
      const result = await runProcess(goCommand(), ['version'], coc.workspace.cwd, goEnvironment())
      const goplsPath = await toolExecutable('gopls')
      let goplsVersion = 'not installed'
      if (goplsPath) {
        const result = await runProcess(goplsPath, ['version'], coc.workspace.cwd, goEnvironment())
        goplsVersion = result.stdout.trim() || `exit code ${result.code}`
      }
      coc.window.showMessage(`Go ${result.stdout.trim()}; gopls ${goplsVersion}`, result.code === 0 ? 'more' : 'error')
    } catch (error) {
      coc.window.showMessage(`Failed to run go version: ${String(error)}`, 'error')
    }
  })
  registerCommand(context, 'go.tools.install', async () => {
    for (const name of Object.keys(tools)) {
      if (!tools[name].optional) await installTool(name)
    }
  })
  for (const name of Object.keys(tools)) {
    registerCommand(context, `go.tools.install.${name}`, async () => {
      if (await installTool(name) && name === 'gopls') await replaceLanguageClient(context)
    })
  }
  registerCommand(context, 'go.gopls.install', async () => {
    if (await installTool('gopls')) await replaceLanguageClient(context)
  })
  registerCommand(context, 'go.languageserver.restart', restartClient)

  registerCommand(context, 'go.locate.tools', async () => {
    const goBin = resolveExecutable(goCommand())
    const lines = [`go: ${goBin || 'not found'}`]
    for (const name of Object.keys(tools)) {
      const binary = await toolExecutable(name)
      lines.push(`${name}: ${binary || 'not found'}`)
    }
    outputChannel?.appendLine(lines.join('\n'))
    outputChannel?.show()
  })
  const gotestsArguments = (...args: string[]): string[] => [
    ...configValue<string[]>('generateTestsFlags', []),
    ...args
  ]
  registerCommand(context, 'go.test.generate.file', async () => {
    const file = await activeFile()
    if (!file) {
      coc.window.showMessage('Open a Go file first.', 'warning')
      return
    }
    await runTool('gotests', gotestsArguments('-w', '-all', file), dirname(file))
  })
  registerCommand(context, 'go.test.generate.package', async () =>
    runTool('gotests', gotestsArguments('-w', '-all', '.'), await cwd()))
  registerCommand(context, 'go.test.generate.function', async () => {
    const lines = await coc.workspace.nvim.eval('getline(1, line("."))')
    const args = testArgumentsAtCursor(lines as string[] | string)
    if (!args || args.includes('-bench')) {
      coc.window.showMessage('Place the cursor inside a Go test or example function.', 'warning')
      return
    }
    const match = /^\s*func\s+(?:\([^)]*\)\s*)?([A-Za-z_]\w*)\s*\(/.exec(
      (Array.isArray(lines) ? lines : String(lines).split('\n')).slice().reverse().find(
        line => /^\s*func\s+(?:\([^)]*\)\s*)?[A-Za-z_]\w*\s*\(/.test(line)
      ) || ''
    )
    if (!match) return
    const file = await activeFile()
    if (file) await runTool('gotests', gotestsArguments('-w', '-only', `^${match[1]}$`, file), dirname(file))
  })
  registerCommand(context, 'go.tags.add', async (tags?: string[] | string) => runModifyTags('add', tags))
  registerCommand(context, 'go.tags.remove', async (tags?: string[] | string) => runModifyTags('remove', tags))
  registerCommand(context, 'go.tags.clear', async () => runModifyTags('clear'))
  registerCommand(context, 'go.impl.cursor', async (implementation?: string) => {
    const file = await activeFile()
    implementation ??= await coc.window.requestInput('Receiver and interface (e.g. *MyReader io.Reader)')
    if (!file || !implementation) return
    await runTool('impl', ['-dir', dirname(file), ...implementation.trim().split(/\s+/)], dirname(file))
  })
  registerCommand(context, 'go.test.cancel', () => {
    for (const process of runningTests) process.kill()
    runningTests.clear()
  })
  registerCommand(context, 'go.test.showOutput', () => outputChannel?.show())
  registerCommand(context, 'go.browse.packages', async () => {
    const directory = await cwd()
    showCommandOutput(`${goCommand()} list all`)
    try {
      const result = await runProcess(goCommand(), ['list', 'all'], directory, goEnvironment())
      const packages = [...new Set(result.stdout.split(/\r?\n/).filter(Boolean))]
      if (result.code !== 0 || !packages.length) {
        coc.window.showMessage(`Unable to list Go packages (exit code ${result.code}).`, 'error')
        return
      }
      const selected = await coc.window.showQuickpick(packages, 'Select a Go package')
      if (selected < 0 || selected >= packages.length) return
      await runGo('doc', [packages[selected]], directory)
    } catch (error) {
      coc.window.showMessage(`Failed to list Go packages: ${String(error)}`, 'error')
    }
  })
}

async function runModifyTags(
  operation: 'add' | 'remove' | 'clear',
  tagInput?: string[] | string
): Promise<void> {
  const file = await activeFile()
  if (!file) {
    coc.window.showMessage('Open a Go file first.', 'warning')
    return
  }
  const structName = await coc.workspace.nvim.eval('expand("<cword>")') as string
  if (!structName) {
    coc.window.showMessage('Place the cursor on a Go struct name.', 'warning')
    return
  }
  if (operation !== 'clear' && tagInput === undefined) {
    tagInput = await coc.window.requestInput(`${operation === 'add' ? 'Tags to add' : 'Tags to remove'} (comma-separated)`)
  }
  const tags = typeof tagInput === 'string'
    ? tagInput.split(',').map(tag => tag.trim()).filter(Boolean)
    : tagInput ?? []
  const args = ['-file', file, '-struct', structName, '-w']
  if (operation === 'add' && tags.length) args.push('-add-tags', tags.join(','))
  else if (operation === 'remove' && tags.length) args.push('-remove-tags', tags.join(','))
  else if (operation === 'clear') args.push('-clear-tags')
  else {
    coc.window.showMessage('Provide one or more tag names.', 'warning')
    return
  }
  await runTool('gomodifytags', args, dirname(file))
}

async function restartClient(): Promise<void> {
  const current = client
  if (!current) return
  if (current.needsStop()) await current.stop()
  current.restart()
}

async function makeLanguageClient(): Promise<LanguageClient | undefined> {
  const resolved = await toolExecutable('gopls')
  if (!resolved) return undefined

  const args = [...configValue<string[]>('languageServerFlags', [])]
  if (configValue('goplsUseDaemon', true) && !args.some(value => value.startsWith('-remote'))) {
    args.push('-remote=auto')
  }
  const disabledFeatures = configValue<Record<string, boolean>>('disable', {})
  const disabled = Object.keys(disabledFeatures).filter(feature => disabledFeatures[feature])
  // coc.nvim changes TMPDIR, which prevents gopls from finding its remote daemon.
  const tmpdir = await coc.workspace.nvim.eval('$TMPDIR')
  const serverEnvironment = {
    ...goEnvironment(),
    ...(typeof tmpdir === 'string' && tmpdir ? { TMPDIR: tmpdir } : {})
  }
  const instance = new coc.LanguageClient('go', 'gopls', {
    command: resolved,
    args,
    options: {
      cwd: coc.workspace.cwd,
      env: serverEnvironment
    }
  }, {
    documentSelector: ['go', 'gomod', 'gowork'],
    outputChannelName: 'gopls',
    progressOnInitialization: true,
    disabledFeatures: disabled,
    initializationOptions: () => goplsOptions(),
    middleware: {
      workspace: {
        configuration: async (params, token, next) => {
          const result = await next(params, token)
          if (!Array.isArray(result)) return result
          return params.items.map((item, index) => item.section === 'gopls' ? goplsOptions() : result[index])
        }
      }
    }
  })
  applyTrace(instance)
  return instance
}

function applyTrace(instance: LanguageClient | undefined): void {
  if (instance) instance.trace = coc.Trace.fromString(configValue('trace.server', 'off'))
}

async function startLanguageClient(context: ExtensionContext): Promise<void> {
  if (!configValue('useLanguageServer', true)) return
  let instance = await makeLanguageClient()
  if (!instance && configValue('autoInstallGopls', false)) {
    if (await coc.window.showPrompt('gopls is missing. Install it now?')) {
      if (await installTool('gopls')) instance = await makeLanguageClient()
    }
  }
  if (!instance) {
    coc.window.showMessage(
      'gopls was not found. Run :CocCommand go.gopls.install or set go.alternateTools.gopls.',
      'warning'
    )
    return
  }
  client = instance
  clientRegistration = coc.services.registerLanguageClient(instance)
  context.subscriptions.push(clientRegistration)
}

function refreshFormatProvider(context: ExtensionContext): void {
  formatRegistration?.dispose()
  formatRegistration = undefined
  const languageServer = configValue('useLanguageServer', true)
  const tool = configValue<string>('formatTool', 'default')
  if (languageServer && tool === 'default') return

  const provider = {
    provideDocumentFormattingEdits: async (document: coc.TextDocument): Promise<coc.TextEdit[]> => {
      if (!document.uri.startsWith('file:')) return []
      const file = fileURLToPath(document.uri)
      const flags = configValue<string[]>('formatFlags', [])
      const resolved = tool === 'default' ? 'goimports' : tool
      const name = resolved === 'custom' ? 'customFormatter' : resolved
      const args = resolved === 'goimports' ? ['-srcdir', dirname(file), ...flags] : flags
      const text = document.getText()
      const result = await runTool(name, args, dirname(file), { input: text, quiet: true })
      if (!result || result.code !== 0) {
        if (result) coc.window.showMessage(`${name} failed: ${result.output.trim().split(/\r?\n/)[0] ?? ''}`, 'error')
        return []
      }
      if (result.stdout === text) return []
      const end = document.positionAt(text.length)
      return [coc.TextEdit.replace(coc.Range.create(0, 0, end.line, end.character), result.stdout)]
    }
  }
  formatRegistration = coc.languages.registerDocumentFormatProvider(['go'], provider, 100)
  context.subscriptions.push(formatRegistration)
}

async function checkGoplsUpdate(context: ExtensionContext): Promise<void> {
  if (configValue('toolsManagement.checkForUpdates', 'proxy') !== 'proxy') return
  const executable = await toolExecutable('gopls')
  if (!executable) return
  const env = goEnvironment()
  try {
    const info = await execFileText(goCommand(), ['version', '-m', executable], env)
    const match = /^\s*mod\s+(\S+)\s+(v\S+)/m.exec(info)
    if (!match) return
    const [, module, installed] = match
    const latestInfo = await execFileText(goCommand(), ['list', '-m', '-json', `${module}@latest`], env)
    const latest = (JSON.parse(latestInfo) as { Version?: string }).Version
    if (!latest || latest === installed || installed.includes('-0.')) return
    const autoUpdate = configValue('toolsManagement.autoUpdate', false)
    if (!autoUpdate && !await coc.window.showPrompt(`gopls ${latest} is available (installed: ${installed}). Update now?`)) return
    if (await installTool('gopls')) await replaceLanguageClient(context)
  } catch {
    // Offline or no module proxy access; skip the update check silently.
  }
}

export async function activate(context: ExtensionContext): Promise<void> {
  outputChannel = coc.window.createOutputChannel('Go')
  context.subscriptions.push(outputChannel)
  context.subscriptions.push({
    dispose: () => {
      for (const process of runningProcesses) process.kill()
      runningProcesses.clear()
    }
  })
  registerCommands(context)

  await startLanguageClient(context)
  refreshFormatProvider(context)
  await activateTerminalEnvironment()
  void checkGoplsUpdate(context)

  context.subscriptions.push(coc.workspace.onDidChangeConfiguration(async event => {
    if (event.affectsConfiguration('go.trace.server')) applyTrace(client)
    if (
      event.affectsConfiguration('go.formatTool') ||
      event.affectsConfiguration('go.useLanguageServer') ||
      event.affectsConfiguration('go.alternateTools')
    ) refreshFormatProvider(context)
    if (
      event.affectsConfiguration('go.terminal') ||
      event.affectsConfiguration('go.goroot') ||
      event.affectsConfiguration('go.gopath') ||
      event.affectsConfiguration('go.inferGopath') ||
      event.affectsConfiguration('go.toolsEnvVars') ||
      event.affectsConfiguration('go.alternateTools')
    ) await activateTerminalEnvironment()
    if (restartSettings.some(name => event.affectsConfiguration(name))) {
      await replaceLanguageClient(context)
    }
  }))

  context.subscriptions.push(coc.workspace.onDidSaveTextDocument(async document => {
    if (document.languageId !== 'go' || !document.uri.startsWith('file:')) return
    const file = fileURLToPath(document.uri)
    const directory = dirname(file)
    if (!configValue('useLanguageServer', true)) {
      const build = configValue<string>('buildOnSave', 'package')
      if (build !== 'off') await runCheck('build', build as CheckScope, directory, file)
      const vet = configValue<string>('vetOnSave', 'package')
      if (vet !== 'off') await runCheck('vet', vet as CheckScope, directory, file)
    }
    const lint = configValue<string>('lintOnSave', 'package')
    if (lint !== 'off' && configValue('lintTool', '')) await runCheck('lint', lint as CheckScope, directory, file)
    if (configValue('testOnSave', false)) await runTests([], directory)
  }))
}

async function replaceLanguageClient(context: ExtensionContext): Promise<void> {
  const current = client
  client = undefined
  clientRegistration?.dispose()
  clientRegistration = undefined
  if (current?.needsStop()) await current.stop().catch(() => undefined)
  await startLanguageClient(context)
}

export async function deactivate(): Promise<void> {
  const current = client
  const registration = clientRegistration
  client = undefined
  clientRegistration = undefined
  registration?.dispose()
  formatRegistration?.dispose()
  formatRegistration = undefined
  if (current?.needsStop()) await current.stop().catch(() => undefined)
  for (const process of runningProcesses) process.kill()
  runningProcesses.clear()
  runningTests.clear()
  outputChannel?.dispose()
  outputChannel = undefined
}
