import type { Disposable, ExtensionContext } from 'coc.nvim'
import type { CheckScope } from './check'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { listManager, workspace } from 'coc.nvim'
import { Checker } from './check'
import { registerBuildCommands } from './commands/build'
import { registerCoverageCommands } from './commands/coverage'
import { registerEditCommands } from './commands/edit'
import { registerEnvironmentCommands } from './commands/environment'
import { CommandManager } from './commands/index'
import { registerModuleCommands } from './commands/mod'
import { registerTagCommands } from './commands/tags'
import { registerTestCommands } from './commands/test'
import { Converter, registerConvertCommands } from './convert'
import { ConvertSession } from './convert-session'
import { CoverageManager } from './coverage'
import { DisposableStore } from './disposable'
import { ConfigManager } from './go/config'
import { GoEnvironment } from './go/environment'
import { OutputChannel } from './go/output'
import { ProcessRunner } from './go/process'
import { TerminalManager } from './go/terminal'
import { ToolManager } from './go/tools'
import { Formatter } from './lsp/format'
import { checkGoplsUpdate, LanguageServer, registerLspCommands } from './lsp/language-server'
import { PkgSearch, registerPkgCommands } from './pkg'
import { StatusBar } from './status'
import { registerTestExplorerCommands, TestExplorer } from './test-explorer'
import { TestRunner } from './test/runner'

// Converts a document URI to a path, or leaves it undefined for non-file documents.
function filePath(uri: string): string | undefined {
  try {
    return fileURLToPath(uri)
  } catch {
    return undefined
  }
}

// Runs the configured checks and tests when a Go file is saved.
function registerSaveWatcher(ctx: Ctx): void {
  ctx.watch(workspace.onDidSaveTextDocument(async (document) => {
    if (document.languageId !== 'go' || !document.uri.startsWith('file:')) return
    const file = filePath(document.uri)
    if (!file) return
    const directory = dirname(file)
    const config = ctx.config
    if (!config.get('useLanguageServer', true)) {
      const build = config.get<string>('buildOnSave', 'package')
      if (build !== 'off') await ctx.checker.run('build', build as CheckScope, { cwd: directory, file })
      const vet = config.get<string>('vetOnSave', 'package')
      if (vet !== 'off') await ctx.checker.run('vet', vet as CheckScope, { cwd: directory, file })
    }
    const lint = config.get<string>('lintOnSave', 'package')
    if (lint !== 'off' && config.get('lintTool', '')) {
      await ctx.checker.run('lint', lint as CheckScope, { cwd: directory, file })
    }
    if (config.get('testOnSave', false)) await ctx.tests.run([], directory)
  }))
}

// The extension's composition root. Every module is created here, wired to the
// others through `this`, and released as a unit in `dispose`.
export class Ctx {
  readonly config = new ConfigManager()
  readonly output = new OutputChannel()
  readonly convertSession: ConvertSession
  readonly environment: GoEnvironment
  readonly process: ProcessRunner
  readonly terminal: TerminalManager
  readonly tools: ToolManager
  readonly languageServer: LanguageServer
  readonly formatter: Formatter
  readonly statusBar: StatusBar
  readonly checker: Checker
  readonly coverage: CoverageManager
  readonly tests: TestRunner
  readonly explorer: TestExplorer
  readonly converter: Converter
  readonly pkgSearch: PkgSearch
  readonly commands: CommandManager

  private readonly watchers = new DisposableStore()

  constructor(public readonly ext: ExtensionContext) {
    this.convertSession = new ConvertSession()
    this.environment = new GoEnvironment(this)
    this.process = new ProcessRunner(this)
    this.terminal = new TerminalManager(this)
    this.tools = new ToolManager(this)
    this.languageServer = new LanguageServer(this)
    this.formatter = new Formatter(this)
    this.statusBar = new StatusBar(this)
    this.checker = new Checker(this)
    this.coverage = new CoverageManager(this)
    this.tests = new TestRunner(this)
    this.explorer = new TestExplorer(this)
    this.converter = new Converter(this)
    this.pkgSearch = new PkgSearch(this)
    this.commands = new CommandManager()
    this.watch(listManager.registerList(this.pkgSearch))

    registerTestCommands(this)
    registerTestExplorerCommands(this)
    registerCoverageCommands(this)
    registerBuildCommands(this)
    registerEditCommands(this)
    registerTagCommands(this)
    registerConvertCommands(this)
    registerEnvironmentCommands(this)
    registerModuleCommands(this)
    registerPkgCommands(this)
    registerLspCommands(this)
    registerSaveWatcher(this)
  }

  // Registers a disposable that belongs to no single module. These are released
  // first, before the modules they depend on.
  watch<T extends Disposable>(disposable: T): T {
    return this.watchers.track(disposable)
  }

  async start(): Promise<void> {
    await this.languageServer.start()
    await this.statusBar.start()
    this.formatter.refresh()
    await this.environment.activateTerminal()
    void checkGoplsUpdate(this)
  }

  async dispose(): Promise<void> {
    this.watchers.dispose()
    await this.languageServer.stop()
    this.convertSession.dispose()
    this.converter.dispose()
    this.explorer.dispose()
    this.coverage.dispose()
    this.tests.dispose()
    this.pkgSearch.dispose()
    this.checker.dispose()
    this.statusBar.dispose()
    this.formatter.dispose()
    this.languageServer.dispose()
    this.commands.dispose()
    this.tools.dispose()
    this.terminal.dispose()
    this.process.dispose()
    this.environment.dispose()
    this.output.dispose()
    this.config.dispose()
  }
}
