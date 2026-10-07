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
workspace files. Configure gopls through `go.goplsOptions`; native coc.nvim
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
`go.testEnv` adds test-specific environment variables.

### Build and Go tools

- `go.build.package`, `go.build.workspace`, `go.run`, `go.generate.package`
- `go.vet.package`, `go.vet.workspace`, `go.lint.package`, `go.lint.workspace`
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
`gomodifytags`, `gotests`, and `impl`. Go build, test, vet, and lint output goes
to the `Go` output channel. `go.buildOnSave` optionally runs a package build
after saving Go source.

## Configuration

```json
{
  "go.goPath": "go",
  "go.goEnv": {},
  "go.toolsEnvVars": {},
  "go.gopath": "",
  "go.goroot": "",
  "go.gobin": "",
  "go.buildFlags": [],
  "go.goplsPath": "gopls",
  "go.goplsArgs": [],
  "go.goplsEnv": {},
  "go.goplsOptions": {},
  "go.goplsUseDaemon": true,
  "go.autoInstallGopls": true,
  "go.autoInstallTools": false,
  "go.testFlags": [],
  "go.testEnv": {},
  "go.benchmarkFlags": [],
  "go.buildOnSave": false,
  "go.disable": {}
}
```

Go environment values are inherited by `gopls` and Go tools. Changes to Go or
gopls environment and launch settings replace the running language client.

## Not yet ported

The persistent VS Code test explorer, Delve debug adapter UI, full Go toolchain
environment switcher, survey and telemetry, coverage overlays, and rich
diagnostic/code-coverage visualization are not included. A coc.nvim quick-pick
test selector and gopls-provided run/generate code lenses cover the basic test
workflow; Delve can be installed for external DAP clients. The list is
deliberate; unsupported VS Code UI is not emulated with nonfunctional commands.
