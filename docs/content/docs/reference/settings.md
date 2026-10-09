---
title: Settings
description: Configuration reference for the go.* settings.
---

<!-- Generated from package.json (and src/tools.ts). Do not edit by hand. -->
This page lists the 63 `go.*` settings. See [gopls settings](./gopls-settings) for language-server options.

| Setting | Type | Default |
| --- | --- | --- |
| `go.useLanguageServer` | `boolean` | `true` |
| `go.languageServerFlags` | `array` | `[]` |
| `go.statusBar.enable` | `boolean` | `true` |
| `go.trace.server` | `string` | `"off"` |
| `go.diagnostic.vulncheck` | `string` | `"Imports"` |
| `go.enableCodeLens` | `object` | `{"runtest":true}` |
| `go.enableCodeLens.runtest` | `boolean` | `true` |
| `go.gopath` | `string | null` | `null` |
| `go.goroot` | `string | null` | `null` |
| `go.inferGopath` | `boolean` | `false` |
| `go.toolsGopath` | `string | null` | `null` |
| `go.toolsEnvVars` | `object` | `{}` |
| `go.toolsManagement.go` | `string` | `""` |
| `go.toolsManagement.checkForUpdates` | `string` | `"proxy"` |
| `go.toolsManagement.autoUpdate` | `boolean` | `false` |
| `go.alternateTools` | `object` | `{}` |
| `go.alternateTools.go` | `string` | `"go"` |
| `go.alternateTools.gopls` | `string` | `"gopls"` |
| `go.alternateTools.dlv` | `string` | `"dlv"` |
| `go.alternateTools.customFormatter` | `string` | `""` |
| `go.alternateTools.gotests` | `string` | `""` |
| `go.alternateTools.goimports` | `string` | `""` |
| `go.alternateTools.staticcheck` | `string` | `""` |
| `go.alternateTools.gomodifytags` | `string` | `""` |
| `go.alternateTools.impl` | `string` | `""` |
| `go.alternateTools.golint` | `string` | `""` |
| `go.alternateTools.golangci-lint` | `string` | `""` |
| `go.alternateTools.golangci-lint-v2` | `string` | `""` |
| `go.alternateTools.revive` | `string` | `""` |
| `go.alternateTools.gofumpt` | `string` | `""` |
| `go.alternateTools.goformat` | `string` | `""` |
| `go.installDependenciesWhenBuilding` | `boolean` | `false` |
| `go.terminal.activateEnvironment` | `boolean` | `true` |
| `go.buildOnSave` | `string` | `"package"` |
| `go.buildFlags` | `string[]` | `[]` |
| `go.buildTags` | `string` | `""` |
| `go.vetOnSave` | `string` | `"package"` |
| `go.vetFlags` | `string[]` | `[]` |
| `go.lintOnSave` | `string` | `"package"` |
| `go.lintTool` | `string` | — |
| `go.lintFlags` | `string[]` | `[]` |
| `go.formatTool` | `string` | `"default"` |
| `go.formatFlags` | `string[]` | `[]` |
| `go.testTags` | `string | null` | `null` |
| `go.testOnSave` | `boolean` | `false` |
| `go.testTimeout` | `string` | `"30s"` |
| `go.testEnvVars` | `object` | `{}` |
| `go.testEnvFile` | `string` | `null` |
| `go.testFlags` | `array | null` | `null` |
| `go.generateTestsFlags` | `string[]` | `[]` |
| `go.inlayHints.assignVariableTypes` | `boolean` | `false` |
| `go.inlayHints.compositeLiteralFields` | `boolean` | `false` |
| `go.inlayHints.compositeLiteralTypes` | `boolean` | `false` |
| `go.inlayHints.constantValues` | `boolean` | `false` |
| `go.inlayHints.functionTypeParameters` | `boolean` | `false` |
| `go.inlayHints.parameterNames` | `boolean` | `false` |
| `go.inlayHints.rangeVariableTypes` | `boolean` | `false` |
| `go.inlayHints.ignoredError` | `boolean` | `false` |
| `go.goplsUseDaemon` | `boolean` | `true` |
| `go.autoInstallGopls` | `boolean` | `true` |
| `go.autoInstallTools` | `boolean` | `true` |
| `go.benchmarkFlags` | `string[]` | `[]` |
| `go.disable` | `object` | `{}` |

## Settings

## `go.useLanguageServer`

**Type:** `boolean` · **Default:** `true`

Enable intellisense, code navigation, refactoring, formatting & diagnostics for Go. The features are powered by the Go language server "gopls".

## `go.languageServerFlags`

**Type:** `array` · **Default:** `[]`

Flags like -rpc.trace and -logfile to be used while running the language server.

## `go.statusBar.enable`

**Type:** `boolean` · **Default:** `true`

Show the gopls status in the status bar.

## `go.trace.server`

**Type:** `string` · **Default:** `"off"`

Trace the communication between VS Code and the Go language server. Also requires setting the 'gopls' output channel log level to 'Trace' ('Developer: Set Log Level...').

**Options:**

- `off`
- `messages`
- `verbose`

## `go.diagnostic.vulncheck`

**Type:** `string` · **Default:** `"Imports"`

(Experimental) vulncheck enables vulnerability scanning.

**Options:**

- `Imports` — `"Imports"`: In Imports mode, `gopls` will report vulnerabilities that affect packages directly and indirectly used by the analyzed main module.
- `Off` — `"Off"`: Disable vulnerability analysis.

## `go.enableCodeLens`

**Type:** `object` · **Default:** `{"runtest":true}`

Feature level setting to enable/disable code lens for references and run/debug tests

## `go.enableCodeLens.runtest`

**Type:** `boolean` · **Default:** `true`

If true, enables code lens for running and debugging tests

## `go.gopath`

**Type:** `string | null` · **Default:** `null`

Specify GOPATH here to override the one that is set as environment variable. The inferred GOPATH from workspace root overrides this, if go.inferGopath is set to true.

## `go.goroot`

**Type:** `string | null` · **Default:** `null`

Specifies the GOROOT to use when no environment variable is set.

## `go.inferGopath`

**Type:** `boolean` · **Default:** `false`

Infer GOPATH from the workspace root. This is ignored when using Go Modules.

## `go.toolsGopath`

**Type:** `string | null` · **Default:** `null`

Location to install the Go tools that the extension depends on if you don't want them in your GOPATH.

## `go.toolsEnvVars`

**Type:** `object` · **Default:** `{}`

Environment variables that will be passed to the tools that run the Go tools (e.g. CGO_CFLAGS) and debuggee process launched by Delve. Format as string key:value pairs. When debugging, merged with `envFile` and `env` values with precedence `env` > `envFile` > `go.toolsEnvVars`.

## `go.toolsManagement.go`

**Type:** `string` · **Default:** `""`

The path to the `go` binary used to install the Go tools. If it's empty, the same `go` binary chosen for the project will be used for tool installation.

## `go.toolsManagement.checkForUpdates`

**Type:** `string` · **Default:** `"proxy"`

Specify whether to prompt about new versions of Go and the Go tools (currently, only `gopls`) the extension depends on

**Options:**

- `proxy` — keeps notified of new releases by checking the Go module proxy (GOPROXY)
- `local` — checks only the minimum tools versions required by the extension
- `off` — completely disables version check (not recommended)

## `go.toolsManagement.autoUpdate`

**Type:** `boolean` · **Default:** `false`

Automatically update the tools used by the extension, without prompting the user.

## `go.alternateTools`

**Type:** `object` · **Default:** `{}`

Alternate tools or alternate paths for the same tools used by the Go extension. Provide either absolute path or the name of the binary in GOPATH/bin, GOROOT/bin or PATH. Useful when you want to use wrapper script for the Go tools.

## `go.alternateTools.go`

**Type:** `string` · **Default:** `"go"`

Alternate tool to use instead of the go binary or alternate path to use for the go binary.

## `go.alternateTools.gopls`

**Type:** `string` · **Default:** `"gopls"`

Alternate tool to use instead of the gopls binary or alternate path to use for the gopls binary.

## `go.alternateTools.dlv`

**Type:** `string` · **Default:** `"dlv"`

Alternate tool to use instead of the dlv binary or alternate path to use for the dlv binary.

## `go.alternateTools.customFormatter`

**Type:** `string` · **Default:** `""`

Custom formatter to use instead of the language server. This should be used with the `custom` option in `#go.formatTool#`.

## `go.alternateTools.gotests`

**Type:** `string` · **Default:** `""`

Alternate tool to use instead of the gotests binary or alternate path to use for the gotests binary.

## `go.alternateTools.goimports`

**Type:** `string` · **Default:** `""`

Alternate tool to use instead of the goimports binary or alternate path to use for the goimports binary.

## `go.alternateTools.staticcheck`

**Type:** `string` · **Default:** `""`

Alternate tool to use instead of the staticcheck binary or alternate path to use for the staticcheck binary.

## `go.alternateTools.gomodifytags`

**Type:** `string` · **Default:** `""`

Alternate tool to use instead of the gomodifytags binary or alternate path to use for the gomodifytags binary.

## `go.alternateTools.impl`

**Type:** `string` · **Default:** `""`

Alternate tool to use instead of the impl binary or alternate path to use for the impl binary.

## `go.alternateTools.golint`

**Type:** `string` · **Default:** `""`

Alternate tool to use instead of the golint binary or alternate path to use for the golint binary.

## `go.alternateTools.golangci-lint`

**Type:** `string` · **Default:** `""`

Alternate tool to use instead of the golangci-lint binary or alternate path to use for the golangci-lint binary.

## `go.alternateTools.golangci-lint-v2`

**Type:** `string` · **Default:** `""`

Alternate tool to use instead of the golangci-lint-v2 binary or alternate path to use for the golangci-lint-v2 binary.

## `go.alternateTools.revive`

**Type:** `string` · **Default:** `""`

Alternate tool to use instead of the revive binary or alternate path to use for the revive binary.

## `go.alternateTools.gofumpt`

**Type:** `string` · **Default:** `""`

Alternate tool to use instead of the gofumpt binary or alternate path to use for the gofumpt binary.

## `go.alternateTools.goformat`

**Type:** `string` · **Default:** `""`

Alternate tool to use instead of the goformat binary or alternate path to use for the goformat binary.

## `go.installDependenciesWhenBuilding`

**Type:** `boolean` · **Default:** `false`

If true, then `-i` flag will be passed to `go build` everytime the code is compiled. Since Go 1.10, setting this may be unnecessary unless you are in GOPATH mode and do not use the language server.

## `go.terminal.activateEnvironment`

**Type:** `boolean` · **Default:** `true`

Apply the Go & PATH environment variables used by the extension to all integrated terminals.

## `go.buildOnSave`

**Type:** `string` · **Default:** `"package"`

Compiles code on file save using 'go build' or 'go test -c'. Not applicable when using the language server.

**Options:**

- `package`
- `workspace`
- `off`

## `go.buildFlags`

**Type:** `string[]` · **Default:** `[]`

Flags to `go build`/`go test` used during build-on-save or running tests. (e.g. ["-ldflags='-s'"]) This is propagated to the language server if `gopls.build.buildFlags` is not specified.

## `go.buildTags`

**Type:** `string` · **Default:** `""`

The Go build tags to use for all commands, that support a `-tags '...'` argument. When running tests, go.testTags will be used instead if it was set. This is propagated to the language server if `gopls.build.buildFlags` is not specified.

## `go.vetOnSave`

**Type:** `string` · **Default:** `"package"`

Vets code on file save using 'go tool vet'. Not applicable when using the language server's diagnostics.

**Options:**

- `package` — vet the current package on file saving
- `workspace` — vet all the packages in the current workspace root folder on file saving
- `off` — do not run vet automatically

## `go.vetFlags`

**Type:** `string[]` · **Default:** `[]`

Flags to pass to `go tool vet` (e.g. ["-all", "-shadow"]). Not applicable when using the language server's diagnostics.

## `go.lintOnSave`

**Type:** `string` · **Default:** `"package"`

Lints code on file save using the configured Lint tool. Options are 'file', 'package', 'workspace' or 'off'.

**Options:**

- `file` — lint the current file on file saving
- `package` — lint the current package on file saving
- `workspace` — lint all the packages in the current workspace root folder on file saving
- `off` — do not run lint automatically

## `go.lintTool`

**Type:** `string`

Specifies an additional client-side linting tool that should be run by the Go extension. By default (unset), no additional linter is run. This feature is additional to diagnostics reported by the language server, gopls. Since Gopls incorporates the entire staticcheck analyzer suite, it is typically unnecessary to run the staticcheck tool as well. To configure gopls's linting, see the 'gopls.ui.diagnostic' settings.

**Options:**

- `staticcheck` — Run `staticcheck`.
- `golint` — Run `golint`.
- `golangci-lint` — Run `golangci-lint` v1.
- `golangci-lint-v2` — Run `golangci-lint` v2.
- `revive` — Run `revive`.

## `go.lintFlags`

**Type:** `string[]` · **Default:** `[]`

Flags to pass to Lint tool (e.g. ["-min_confidence=.8"])

## `go.formatTool`

**Type:** `string` · **Default:** `"default"`

Specifies the tool for formatting Go code. The default is `default`, which uses the language server `gopls` as formatting provider. To configure gopls's formatting, see the 'gopls.formatting' settings. When a specific tool (e.g., `gofmt`, `goimports`) is selected, the extension will run it instead.

**Options:**

- `default` — Formatting is performed by the language server, gopls. (recommended)
- `gofmt` — Formats using `gofmt`, the standard Go formatter. See https://pkg.go.dev/cmd/gofmt.
- `goimports` — Formats using `goimports`, which organizes imports and applies `gofmt`. See https://pkg.go.dev/golang.org/x/tools/cmd/goimports.
- `goformat` — Formats using `goformat`, a configurable version of `gofmt`. See https://github.com/mbenkmann/goformat. (Deprecated due to lack of generics support)
- `gofumpt` — Formats using `gofumpt`, a stricter version of `gofmt`. See https://github.com/mvdan/gofumpt. Note: `gopls` can also be configured to use `gofumpt` via the `#gopls.formatting.gofumpt#` setting.
- `custom` — Formats using a custom tool. The tool's path must be specified in the `#go.alternateTools#` setting under the `customFormatter` key.

## `go.formatFlags`

**Type:** `string[]` · **Default:** `[]`

Flags to pass to format tool (e.g. ["-s"]). Not applicable when using the language server.

## `go.testTags`

**Type:** `string | null` · **Default:** `null`

The Go build tags to use for when running tests. If null, then buildTags will be used.

## `go.testOnSave`

**Type:** `boolean` · **Default:** `false`

Run 'go test' on save for current package. It is not advised to set this to `true` when you have Auto Save enabled.

## `go.testTimeout`

**Type:** `string` · **Default:** `"30s"`

Specifies the timeout for go test in ParseDuration format.

## `go.testEnvVars`

**Type:** `object` · **Default:** `{}`

Environment variables that will be passed to the process that runs the Go tests

## `go.testEnvFile`

**Type:** `string` · **Default:** `null`

Absolute path to a file containing environment variables definitions. File contents should be of the form key=value.

## `go.testFlags`

**Type:** `array | null` · **Default:** `null`

Flags to pass to `go test`. If null, then buildFlags will be used. This is not propagated to the language server.

## `go.generateTestsFlags`

**Type:** `string[]` · **Default:** `[]`

Additional command line flags to pass to `gotests` for generating tests.

## `go.inlayHints.assignVariableTypes`

**Type:** `boolean` · **Default:** `false`

`"assignVariableTypes"` controls inlay hints for variable types in assign statements:
```go
	i« int», j« int» := 0, len(r)-1
```

## `go.inlayHints.compositeLiteralFields`

**Type:** `boolean` · **Default:** `false`

`"compositeLiteralFields"` inlay hints for composite literal field names:
```go
	Point2D{«X: »1, «Y: »2}

	Outer{«Embedded.»Field: 0}
```

## `go.inlayHints.compositeLiteralTypes`

**Type:** `boolean` · **Default:** `false`

`"compositeLiteralTypes"` controls inlay hints for composite literal types:
```go
	for _, c := range []struct {
		in, want string
	}{
		«struct{ in string; want string }»{"Hello, world", "dlrow ,olleH"},
	}
```

## `go.inlayHints.constantValues`

**Type:** `boolean` · **Default:** `false`

`"constantValues"` controls inlay hints for constant values:
```go
	const (
		KindNone   Kind = iota« = 0»
		KindPrint«  = 1»
		KindPrintf« = 2»
		KindErrorf« = 3»
	)
```

## `go.inlayHints.functionTypeParameters`

**Type:** `boolean` · **Default:** `false`

`"functionTypeParameters"` inlay hints for implicit type parameters on generic functions:
```go
	myFoo«[int, string]»(1, "hello")
```

## `go.inlayHints.parameterNames`

**Type:** `boolean` · **Default:** `false`

`"parameterNames"` controls inlay hints for parameter names:
```go
	parseInt(« str: » "123", « radix: » 8)
```

## `go.inlayHints.rangeVariableTypes`

**Type:** `boolean` · **Default:** `false`

`"rangeVariableTypes"` controls inlay hints for variable types in range statements:
```go
	for k« int», v« string» := range []string{} {
		fmt.Println(k, v)
	}
```

## `go.inlayHints.ignoredError`

**Type:** `boolean` · **Default:** `false`

`"ignoredError"` inlay hints for implicitly discarded errors:
```go
	f.Close()« // ignore error»
```
This check inserts an `// ignore error` hint following any
statement that is a function call whose error result is
implicitly ignored.

To suppress the hint, write an actual comment containing
one of the following strings:
```
ignore error
discard error
can't fail
cannot fail
```
following the call statement, or explicitly assign the
result to a blank variable.

A handful of common functions such as `fmt.Println` are
excluded from the check.

## `go.goplsUseDaemon`

**Type:** `boolean` · **Default:** `true`

Use the gopls remote daemon when supported.

## `go.autoInstallGopls`

**Type:** `boolean` · **Default:** `true`

Ask to install gopls when it is not found.

## `go.autoInstallTools`

**Type:** `boolean` · **Default:** `true`

Offer to install Go tools when a command needs a missing tool.

## `go.benchmarkFlags`

**Type:** `string[]` · **Default:** `[]`

Additional arguments passed to go test benchmarks.

## `go.disable`

**Type:** `object` · **Default:** `{}`

Disable selected gopls language-client features.

