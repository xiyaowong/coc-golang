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

`gopls` provides editor language features. Test and Go command output appears in coc.nvim's `Go` output channel.

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

### Build and Go tools

Build, run, generate, and check Go code:

- `go.build.package`, `go.build.workspace`, `go.run`, `go.generate.package`
- `go.vet.package`, `go.vet.workspace`, `go.lint.package`, `go.lint.workspace`

Scan Go packages and workspaces for known vulnerabilities:

- `go.vulncheck.package`, `go.vulncheck.workspace` (requires `govulncheck`)
- `go.vulncheck.toggle` toggles gopls' `vulncheck` option (`Imports`/`Off`) in
  `go.goplsOptions` and restarts gopls


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
  "go.goplsOptions": {},
  "go.testFlags": [],
  "go.testEnv": {},
  "go.benchmarkFlags": [],
  "go.buildOnSave": false
}
```

Type `go.` in `coc-settings.json` to see completions and descriptions for all available settings. `go.goplsOptions` configures `gopls`; test and benchmark flags use arrays, and `go.testEnv` sets test environment variables. Set `go.buildOnSave` to `true` to build the current package when you save a Go file.
