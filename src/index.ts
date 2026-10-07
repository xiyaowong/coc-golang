import { execFile, spawn } from 'node:child_process'
import { accessSync, constants, existsSync } from 'node:fs'
import { delimiter, dirname, isAbsolute, join } from 'node:path'
import { homedir, platform } from 'node:os'
import { fileURLToPath } from 'node:url'
import * as coc from 'coc.nvim'
import type { ChildProcess } from 'node:child_process'
import type { Disposable, ExtensionContext, LanguageClient } from 'coc.nvim'
import { testArgumentsAtCursor, testArgumentsForFile, testNameAtCursor } from './go-test-utils'

const restartSettings = [
  'go.goplsPath',
  'go.goplsArgs',
  'go.goplsEnv',
  'go.goplsOptions',
  'go.goplsUseDaemon',
  'go.goPath',
  'go.goEnv',
  'go.goroot',
  'go.gopath',
  'go.gobin',
  'go.toolsEnvVars'
]

const tools = {
  gopls: 'golang.org/x/tools/gopls@latest',
  dlv: 'github.com/go-delve/delve/cmd/dlv@latest',
  goimports: 'golang.org/x/tools/cmd/goimports@latest',
  staticcheck: 'honnef.co/go/tools/cmd/staticcheck@latest',
  gomodifytags: 'github.com/fatih/gomodifytags@latest',
  gotests: 'github.com/cweill/gotests/gotests@latest',
  impl: 'github.com/josharian/impl@latest'
}

const defaultGoplsOptions = {
  codelenses: {
    generate: true,
    test: true,
    tidy: true,
    upgrade_dependency: true,
    vendor: true
  }
}

type ProcessResult = {
  code: number | null
  stdout: string
}
type GoplsOptions = Record<string, unknown> & {
  codelenses?: Record<string, boolean>
}

let client: LanguageClient | undefined
let clientRegistration: Disposable | undefined
let runningProcesses = new Set<ChildProcess>()
let runningTests = new Set<ChildProcess>()
let outputChannel: coc.OutputChannel | undefined
let previousTest: { args: string[]; cwd: string } | undefined

function configValue<T>(name: string, fallback: T): T {
  return coc.workspace.getConfiguration('go').get(name, fallback)
}

function goCommand(): string {
  return configValue('goPath', 'go')
}

function goEnvironment(): NodeJS.ProcessEnv {
  const config = coc.workspace.getConfiguration('go')
  const environment = {
    ...process.env,
    ...config.get<Record<string, string>>('toolsEnvVars', {}),
    ...config.get<Record<string, string>>('goEnv', {})
  }
  const goroot = config.get<string>('goroot')
  const gopath = config.get<string>('gopath')
  const gobin = config.get<string>('gobin')
  if (goroot) environment.GOROOT = goroot
  if (gopath) environment.GOPATH = gopath
  if (gobin) environment.GOBIN = gobin
  return environment
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
  for (const directory of (env.PATH || '').split(delimiter)) {
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
  processGroup?: Set<ChildProcess>
): Promise<ProcessResult> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true
    })
    runningProcesses.add(child)
    processGroup?.add(child)
    let stdout = ''
    child.stdout?.on('data', (chunk: Buffer) => {
      const value = chunk.toString()
      stdout += value
      outputChannel?.append(value)
    })
    child.stderr?.on('data', (chunk: Buffer) => outputChannel?.append(chunk.toString()))
    child.once('error', error => {
      runningProcesses.delete(child)
      processGroup?.delete(child)
      reject(error)
    })
    child.once('close', code => {
      runningProcesses.delete(child)
      processGroup?.delete(child)
      resolvePromise({ code, stdout })
    })
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
): Promise<void> {
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

async function runTests(
  args: string[],
  cwd: string
): Promise<void> {
  previousTest = { args, cwd }
  await runGo(
    'test',
    [...configValue<string[]>('testFlags', []), ...args],
    cwd,
    true,
    configValue<Record<string, string>>('testEnv', {})
  )
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

async function installTool(name: keyof typeof tools): Promise<boolean> {
  showCommandOutput(`${goCommand()} install ${tools[name]}`)
  try {
    const result = await runProcess(
      goCommand(),
      ['install', tools[name]],
      coc.workspace.cwd,
      goEnvironment()
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
  const found = resolveExecutable(name, env)
  if (found) return found

  const directories = [env.GOBIN]
  let gopath = env.GOPATH
  if (!gopath) {
    try {
      gopath = (await execFileText(goCommand(), ['env', 'GOPATH'], env)).trim()
    } catch {
      gopath = undefined
    }
  }
  if (gopath) directories.push(...gopath.split(platform() === 'win32' ? ';' : ':').map(item => join(item, 'bin')))

  const extensions = platform() === 'win32'
    ? (process.env.PATHEXT || '.EXE;.CMD;.BAT').split(';')
    : ['']
  for (const directory of directories) {
    if (!directory) continue
    for (const extension of extensions) {
      const candidate = join(directory, name + extension)
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

async function runTool(name: keyof typeof tools, args: string[], cwd: string): Promise<void> {
  let executable = await toolExecutable(name)
  if (!executable && configValue('autoInstallTools', false) && await coc.window.showPrompt(`${name} is missing. Install it now?`)) {
    if (await installTool(name)) executable = await toolExecutable(name)
  }
  if (!executable) {
    coc.window.showMessage(`The ${name} tool is not installed. Run :CocCommand go.tools.install.${name}.`, 'warning')
    return
  }
  showCommandOutput(`${executable} ${args.join(' ')}`)
  try {
    const result = await runProcess(executable, args, cwd, goEnvironment())
    if (result.code !== 0) coc.window.showMessage(`${name} exited with code ${result.code}`, 'error')
  } catch (error) {
    coc.window.showMessage(`Failed to run ${name}: ${String(error)}`, 'error')
  }
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
      const flags = subcommand === 'build' ? configValue<string[]>('buildFlags', []) : []
      await runGo(subcommand, [...flags, ...args], await cwd())
    })
  }
  packageCommand('go.build.package', 'build')
  packageCommand('go.vet.package', 'vet')
  packageCommand('go.generate.package', 'generate')
  packageCommand('go.mod.tidy', 'mod', ['tidy'])
  packageCommand('go.mod.vendor', 'mod', ['vendor'])
  packageCommand('go.work.sync', 'work', ['sync'])
  registerCommand(context, 'go.run', async (target?: string) =>
    runGo('run', [target || '.'], await cwd()))
  for (const [id, subcommand] of [
    ['go.build.workspace', 'build'],
    ['go.vet.workspace', 'vet']
  ]) {
    registerCommand(context, id, async () => {
      for (const directory of workspaceDirectories()) {
        const flags = subcommand === 'build' ? configValue<string[]>('buildFlags', []) : []
        await runGo(subcommand, [...flags, './...'], directory)
      }
    })
  }
  registerCommand(context, 'go.lint.package', async () =>
    runTool('staticcheck', ['.'], await cwd()))
  registerCommand(context, 'go.lint.workspace', async () =>
    Promise.all(workspaceDirectories().map(directory => runTool('staticcheck', ['./...'], directory))))

  registerCommand(context, 'go.fmt.package', async () =>
    runGo('fmt', ['.'], await cwd()))
  registerCommand(context, 'go.import.organize', async () => {
    await coc.commands.executeCommand('editor.action.organizeImport')
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
    await runGo('install', [packagePath], await cwd())
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
    for (const name of Object.keys(tools) as (keyof typeof tools)[]) {
      await installTool(name)
    }
  })
  for (const name of Object.keys(tools) as (keyof typeof tools)[]) {
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
    for (const name of Object.keys(tools) as (keyof typeof tools)[]) {
      const binary = await toolExecutable(name)
      lines.push(`${name}: ${binary || 'not found'}`)
    }
    outputChannel?.appendLine(lines.join('\n'))
    outputChannel?.show()
  })
  registerCommand(context, 'go.test.generate.file', async () => {
    const file = await activeFile()
    if (!file) {
      coc.window.showMessage('Open a Go file first.', 'warning')
      return
    }
    await runTool('gotests', ['-w', '-all', file], dirname(file))
  })
  registerCommand(context, 'go.test.generate.package', async () =>
    runTool('gotests', ['-w', '-all', '.'], await cwd()))
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
    if (file) await runTool('gotests', ['-w', '-only', `^${match[1]}$`, file], dirname(file))
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
  const command = configValue('goplsPath', 'gopls')
  const resolved = resolveExecutable(command, goEnvironment()) || (
    command === 'gopls' ? await toolExecutable('gopls') : undefined
  )
  if (!resolved) return undefined

  const configuredArgs = configValue<string[]>('goplsArgs', [])
  const args = [...configuredArgs]
  if (configValue('goplsUseDaemon', true) && !args.some(value => value.startsWith('-remote'))) {
    args.push('-remote=auto')
  }
  const disabledFeatures = configValue<Record<string, boolean>>('disable', {})
  const disabled = Object.keys(disabledFeatures).filter(feature => disabledFeatures[feature])
  // coc.nvim changes TMPDIR, which prevents gopls from finding its remote daemon.
  const tmpdir = await coc.workspace.nvim.eval('$TMPDIR')
  const serverEnvironment = {
    ...goEnvironment(),
    ...(typeof tmpdir === 'string' && tmpdir ? { TMPDIR: tmpdir } : {}),
    ...configValue<Record<string, string>>('goplsEnv', {})
  }
  return new coc.LanguageClient('go', 'gopls', {
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
    initializationOptions: () => {
      const options = configValue<GoplsOptions>('goplsOptions', {})
      return {
        ...defaultGoplsOptions,
        ...options,
        codelenses: { ...defaultGoplsOptions.codelenses, ...options.codelenses }
      }
    }
  })
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

  let clientInstance = await makeLanguageClient()
  if (!clientInstance && configValue('autoInstallGopls', false)) {
    if (await coc.window.showPrompt('gopls is missing. Install it now?')) {
      if (await installTool('gopls')) clientInstance = await makeLanguageClient()
    }
  }
  if (!clientInstance) {
    coc.window.showMessage('gopls was not found. Run :CocCommand go.gopls.install or set go.goplsPath.', 'warning')
  }
  if (clientInstance) {
    client = clientInstance
    clientRegistration = coc.services.registerLanguageClient(clientInstance)
    context.subscriptions.push(clientRegistration)
  }

  context.subscriptions.push(coc.workspace.onDidChangeConfiguration(async event => {
    if (restartSettings.some(name => event.affectsConfiguration(name))) {
      await replaceLanguageClient(context)
    }
  }))

  context.subscriptions.push(coc.workspace.onDidSaveTextDocument(async document => {
    if (document.languageId !== 'go' || !configValue('buildOnSave', false)) return
    const file = document.uri.startsWith('file:') ? document.uri : undefined
    if (file) {
      await runGo('build', [...configValue<string[]>('buildFlags', []), '.'], dirname(fileURLToPath(file)))
    }
  }))
}

async function replaceLanguageClient(context: ExtensionContext): Promise<void> {
  const current = client
  client = undefined
  clientRegistration?.dispose()
  clientRegistration = undefined
  if (current?.needsStop()) await current.stop().catch(() => undefined)

  const next = await makeLanguageClient()
  if (!next) {
    if (configValue('autoInstallGopls', false) && await coc.window.showPrompt('gopls is missing. Install it now?')) {
      if (await installTool('gopls')) {
        const installed = await makeLanguageClient()
        if (installed) {
          client = installed
          clientRegistration = coc.services.registerLanguageClient(installed)
          context.subscriptions.push(clientRegistration)
        } else {
          coc.window.showMessage('gopls was not found after installation. Check go.goplsPath and GOBIN.', 'error')
        }
      }
      return
    }
    coc.window.showMessage('gopls was not found. Run :CocCommand go.gopls.install or set go.goplsPath.', 'warning')
    return
  }
  client = next
  clientRegistration = coc.services.registerLanguageClient(next)
  context.subscriptions.push(clientRegistration)
}

export async function deactivate(): Promise<void> {
  const current = client
  const registration = clientRegistration
  client = undefined
  clientRegistration = undefined
  registration?.dispose()
  if (current?.needsStop()) await current.stop().catch(() => undefined)
  for (const process of runningProcesses) process.kill()
  runningProcesses.clear()
  runningTests.clear()
  outputChannel?.dispose()
  outputChannel = undefined
}
