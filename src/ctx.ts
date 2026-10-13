import type { Disposable, ExtensionContext } from 'coc.nvim'
import type { CheckScope } from './check/check'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { workspace } from 'coc.nvim'
import { Checker } from './check/check'
import { BuildCommands } from './commands/build'
import { ConvertCommands } from './commands/convert'
import { EditCommands } from './commands/edit'
import { EnvironmentCommands } from './commands/environment'
import { CommandManager } from './commands/index'
import { LspCommands } from './commands/lsp'
import { ModuleCommands } from './commands/mod'
import { TagCommands } from './commands/tags'
import { TestCommands } from './commands/test'
import { TestExplorer, TestExplorerCommands } from './commands/test-explorer'
import { Converter } from './convert/convert'
import { ConvertSession } from './convert/session'
import { DisposableStore } from './disposable'
import { OutputChannel } from './editor/output'
import { ProcessRunner } from './editor/process'
import { TerminalManager } from './editor/terminal'
import { ConfigManager } from './go/config'
import { GoEnvironment } from './go/environment'
import { ToolManager } from './go/tools'
import { Formatter } from './lsp/format'
import { checkGoplsUpdate } from './lsp/gopls-update'
import { LanguageServer } from './lsp/language-server'
import { StatusBar } from './lsp/status-bar'
import { TestRunner } from './test/run-tests'

// Converts a document URI to a path, or leaves it undefined for non-file documents.
function filePath(uri: string): string | undefined {
  try {
    return fileURLToPath(uri)
  } catch {
    return undefined
  }
}

// Runs the configured checks and tests when a Go file is saved.
class SaveHandler {
  constructor(private readonly ctx: Ctx) {}

  register(): void {
    this.ctx.watch(workspace.onDidSaveTextDocument(async (document) => {
      if (document.languageId !== 'go' || !document.uri.startsWith('file:')) return
      const file = filePath(document.uri)
      if (!file) return
      const directory = dirname(file)
      const config = this.ctx.config
      if (!config.get('useLanguageServer', true)) {
        const build = config.get<string>('buildOnSave', 'package')
        if (build !== 'off') await this.ctx.checker.run('build', build as CheckScope, { cwd: directory, file })
        const vet = config.get<string>('vetOnSave', 'package')
        if (vet !== 'off') await this.ctx.checker.run('vet', vet as CheckScope, { cwd: directory, file })
      }
      const lint = config.get<string>('lintOnSave', 'package')
      if (lint !== 'off' && config.get('lintTool', '')) {
        await this.ctx.checker.run('lint', lint as CheckScope, { cwd: directory, file })
      }
      if (config.get('testOnSave', false)) await this.ctx.tests.run([], directory)
    }))
  }
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
  readonly tests: TestRunner
  readonly explorer: TestExplorer
  readonly converter: Converter
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
    this.tests = new TestRunner(this)
    this.explorer = new TestExplorer(this)
    this.converter = new Converter(this)
    this.commands = new CommandManager()

    new TestCommands(this).register()
    new TestExplorerCommands(this).register()
    new BuildCommands(this).register()
    new EditCommands(this).register()
    new TagCommands(this).register()
    new ConvertCommands(this).register()
    new EnvironmentCommands(this).register()
    new ModuleCommands(this).register()
    new LspCommands(this).register()
    new SaveHandler(this).register()
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

  dispose(): void {
    this.watchers.dispose()
    this.convertSession.dispose()
    this.converter.dispose()
    this.explorer.dispose()
    this.tests.dispose()
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
