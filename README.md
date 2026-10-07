# coc-golang

Go support for [coc.nvim](https://github.com/neoclide/coc.nvim), powered by the official [gopls](https://go.dev/gopls/) language server and Go tools.

## Get started

You need coc.nvim with the 0.0.83-next.27 language-client API or newer, Node.js 22.18 or newer, and Go.

Install the extension:

```vim
:CocInstall coc-golang
```

If `gopls` is missing, the extension prompts you to install it. You can also run `:CocCommand go.gopls.install`.

## Features

| Use case | Features |
| --- | --- |
| Write Go | Completion, hover, signature help, formatting, and import organization |
| Navigate and refactor | Diagnostics, navigation, references, rename, code actions, and document symbols |
| Build and test | Build, run, test, benchmark, coverage, and vulnerability scans |
| Manage projects | Go module and workspace commands, tool installation, and Go environment information |

`gopls` provides editor language features. Test and Go command output appears in coc.nvim's `Go` output channel. Configure gopls through the `gopls` setting.

## Commands

Run a command with `:CocCommand`, for example `:CocCommand go.test.package`.

### Tests and benchmarks

Run tests for a package, file, workspace, or test at the cursor:

- `go.test.package`, `go.test.file`, `go.test.workspace`, `go.test.explorer`
- `go.test.cursor`, `go.subtest.cursor`, `go.test.cursorOrPrevious`, `go.test.previous`

Manage test runs and coverage:

- `go.test.coverage`, `go.test.cancel`, `go.test.showOutput`, `go.toggle.test.file`

Run benchmarks or generate tests:

- `go.benchmark.package`, `go.benchmark.file`, `go.benchmark.cursor`
- `go.test.generate.file`, `go.test.generate.package`, `go.test.generate.function` (requires `gotests`)

Test output is collected in the `Go` output channel.

### Build and Go tools

Build, run, generate, and check Go code:

- `go.build.package`, `go.build.workspace`, `go.run`, `go.generate.package`
- `go.vet.package`, `go.vet.workspace`, `go.lint.package`, `go.lint.workspace`

Scan Go packages and workspaces for known vulnerabilities:

- `go.vulncheck.package`, `go.vulncheck.workspace` (requires `govulncheck`)
- `go.vulncheck.toggle` toggles `go.diagnostic.vulncheck` (`Imports`/`Off`) and restarts gopls

Format code and manage imports:

- `go.fmt.package`, `go.import.organize`, `go.import.add`

Manage modules, workspaces, dependencies, and packages:

- `go.mod.init`, `go.mod.tidy`, `go.mod.vendor`, `go.work.sync`
- `go.get.package`, `go.install.package`, `go.browse.packages`

Add or remove struct tags and generate interface implementations:

- `go.tags.add`, `go.tags.remove`, `go.tags.clear` (requires `gomodifytags`)
- `go.impl.cursor` (requires `impl`)

### Go environment and tools

Inspect the Go environment and locate tools:

- `go.env`, `go.gopath`, `go.goroot`, `go.environment.choose`, `go.version`, `go.locate.tools`

Install `gopls` or optional Go tools:

- `go.gopls.install`, `go.tools.install`, `go.tools.install.<tool>`

Optional tools include `dlv`, `goimports`, `staticcheck`, `govulncheck`, `gomodifytags`, `gotests`, and `impl`. Go build, test, vet, lint, and vulnerability scan output appears in the `Go` output channel.

## Configuration

Add settings to `coc-settings.json`. These are some commonly used options:

```json
{
  "go.useLanguageServer": true,
  "go.languageServerFlags": [],
  "go.trace.server": "off",
  "go.goplsUseDaemon": true,
  "go.autoInstallGopls": true,
  "go.disable": {},
  "gopls": {},
  "go.diagnostic.vulncheck": "Prompt",
  "go.inlayHints.assignVariableTypes": false,
  "go.enableCodeLens": { "runtest": true },

  "go.alternateTools": {},
  "go.goroot": "",
  "go.gopath": "",
  "go.inferGopath": false,
  "go.toolsGopath": "",
  "go.toolsEnvVars": {},
  "go.toolsManagement.go": "",
  "go.toolsManagement.checkForUpdates": "proxy",
  "go.toolsManagement.autoUpdate": false,
  "go.autoInstallTools": false,
  "go.installDependenciesWhenBuilding": false,
  "go.terminal.activateEnvironment": true,

  "go.buildFlags": [],
  "go.buildTags": "",
  "go.buildOnSave": "package",
  "go.vetOnSave": "package",
  "go.vetFlags": [],
  "go.lintTool": "",
  "go.lintOnSave": "package",
  "go.lintFlags": [],
  "go.formatTool": "default",
  "go.formatFlags": [],

  "go.testFlags": null,
  "go.testTags": null,
  "go.testTimeout": "30s",
  "go.testEnvVars": {},
  "go.testEnvFile": null,
  "go.testOnSave": false,
  "go.disableConcurrentTests": false,
  "go.generateTestsFlags": [],
  "go.benchmarkFlags": []
}
```

Setting names, types and defaults follow vscode-go. `go.goplsUseDaemon`,
`go.disable`, `go.autoInstallGopls`, `go.autoInstallTools` and
`go.benchmarkFlags` are coc-golang specific. All `go.inlayHints.*` hints from
vscode-go are supported.

- **gopls**: `gopls` (top-level, dotted keys accepted) is passed to gopls.
  `go.buildFlags`/`go.buildTags` (`build.buildFlags`), `go.inlayHints`
  (`ui.inlayhint.hints`), `go.diagnostic.vulncheck` (`ui.vulncheck`) and
  `go.enableCodeLens` are forwarded unless `gopls` sets them. With
  `go.useLanguageServer: false` gopls is not started and `go.formatTool:
  "default"` uses `goimports`.
- **Environment**: `go.goroot`/`go.gopath`/`go.toolsEnvVars` apply to gopls and
  all tools; `go.toolsGopath` is used for tool installs and lookup;
  `go.alternateTools` replaces `go`, `gopls`, `dlv`, tools, and
  `customFormatter`; `go.terminal.activateEnvironment` exports the environment
  to Neovim.
- **Checks**: build and vet on save run only when `go.useLanguageServer` is
  `false`; lint runs on save when `go.lintTool` is set (`staticcheck`, `golint`,
  `golangci-lint`, `golangci-lint-v2`, `revive`). Results appear as coc
  diagnostics. `go.formatTool` supports `gofmt`, `goimports`, `goformat`,
  `gofumpt` and `custom`.
- **Tests**: `go.testFlags` falls back to `go.buildFlags`, `go.testTags` to
  `go.buildTags`; `-timeout` is added from `go.testTimeout`.
  `go.testEnvFile` is read before `go.testEnvVars`.

### Migrating from earlier versions

| Old | New |
| --- | --- |
| `go.goPath` | `go.alternateTools.go` |
| `go.goplsPath` | `go.alternateTools.gopls` |
| `go.goplsArgs` | `go.languageServerFlags` |
| `go.goplsOptions` | `gopls` |
| `go.goplsEnv`, `go.goEnv`, `go.gobin` | `go.toolsEnvVars` |
| `go.testEnv` | `go.testEnvVars` |
| `go.buildOnSave` (boolean) | `"package"`, `"workspace"` or `"off"` |

## Not yet ported

The persistent VS Code test explorer (`go.experiments`), Delve debug adapter
UI, survey and telemetry, coverage overlays, and rich diagnostic visualization
are not included. Update checks cover `gopls` only (as upstream). A coc.nvim quick-pick test selector and gopls-provided
run/generate code lenses cover the basic test workflow; Delve can be installed
for external DAP clients.

## License

[MIT](LICENSE) © [wongxy](https://github.com/xiyaowong)
