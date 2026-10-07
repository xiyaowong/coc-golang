# coc-golang

Go language support for [coc.nvim](https://github.com/neoclide/coc.nvim), using
the official [gopls](https://go.dev/gopls/) language server and Go command-line
tools.

## Requirements

- coc.nvim with the 0.0.83-next.27 language-client API and Node.js 22.18 or newer.
- Go installed and available on `PATH`.
- `gopls` installed and available on `PATH`, or install it using
  `:CocCommand go.gopls.install`.

Install with `:CocInstall coc-golang`.

## Language support

`gopls` provides completion, hover, signature help, diagnostics, navigation,
references, rename, code actions, document symbols, formatting, import
organization, and run/generate/tidy/test code lenses for Go source, module, and
workspace files. Configure gopls through `gopls`; native coc.nvim
language-client services supply the editor integration. Format-on-save and
organize-imports behavior can be enabled in coc.nvim's Go filetype settings.

## Commands

### Tests and benchmarks

- `go.test.package`, `go.test.file`, `go.test.workspace`, `go.test.explorer`
- `go.test.cursor`, `go.subtest.cursor`, `go.test.cursorOrPrevious`,
  `go.test.previous`
- `go.test.coverage`, `go.test.cancel`, `go.test.showOutput`
- `go.benchmark.package`, `go.benchmark.file`, `go.benchmark.cursor`
- `go.test.generate.file`, `go.test.generate.package`,
  `go.test.generate.function` (requires `gotests`)
- `go.toggle.test.file`

Test output is collected in the `Go` output channel. Test and benchmark flags
are passed as arrays in `go.testFlags` and `go.benchmarkFlags`, while
`go.testEnvVars` adds test-specific environment variables.

### Build and Go tools

- `go.build.package`, `go.build.workspace`, `go.run`, `go.generate.package`
- `go.vet.package`, `go.vet.workspace`, `go.lint.package`, `go.lint.workspace`
- `go.vulncheck.package`, `go.vulncheck.workspace` (requires `govulncheck`)
- `go.vulncheck.toggle` toggles `go.diagnostic.vulncheck` (`Imports`/`Off`)
  and restarts gopls
- `go.fmt.package`, `go.import.organize`, `go.import.add`
- `go.mod.init`, `go.mod.tidy`, `go.mod.vendor`, `go.work.sync`
- `go.get.package`, `go.install.package`, `go.browse.packages`
- `go.tags.add`, `go.tags.remove`, `go.tags.clear` (requires `gomodifytags`)
- `go.impl.cursor` (requires `impl`)
- `go.env`, `go.gopath`, `go.goroot`, `go.environment.choose`, `go.version`,
  `go.locate.tools`
- `go.gopls.install`, `go.tools.install`, and `go.tools.install.<tool>`

Tool installs use the configured Go executable and standard `go install
module@latest` behavior. Optional tools are `dlv`, `goimports`, `staticcheck`,
`govulncheck`, `gomodifytags`, `gotests`, and `impl`. Go build, test, vet, and lint output goes
to the `Go` output channel. `go.buildOnSave` optionally runs a package build
after saving Go source.

## Configuration

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
