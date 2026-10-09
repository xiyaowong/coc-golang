---
title: gopls settings
description: Options passed to the gopls language server.
---

<!-- Generated from package.json (and src/tools.ts). Do not edit by hand. -->
These options configure `gopls` and are passed through as-is. See the
[Analyzer reference](./gopls-analyses) for the bundled analyzers.

| Setting | Type | Default |
| --- | --- | --- |
| `gopls.buildFlags` | `array` | `[]` |
| `gopls.directoryFilters` | `array` | `["-**/node_modules"]` |
| `gopls.env` | `object` | — |
| `gopls.expandWorkspaceToModule` | `boolean` | `true` |
| `gopls.memoryMode` | `string` | `""` |
| `gopls.standaloneTags` | `array` | `["ignore"]` |
| `gopls.templateExtensions` | `array` | `[]` |
| `gopls.workspaceFiles` | `array` | `[]` |
| `gopls.fileWatcher` | `string` | `"off"` |
| `gopls.gofumpt` | `boolean` | `false` |
| `gopls.local` | `string` | `""` |
| `gopls.maxFileCacheBytes` | `number` | `0` |
| `gopls.memoryLimit` | `number` | `0` |
| `gopls.codelenses` | `object` | — |
| `gopls.completeFunctionCalls` | `boolean` | `true` |
| `gopls.completionBudget` | `string` | `"100ms"` |
| `gopls.experimentalPostfixCompletions` | `boolean` | `true` |
| `gopls.matcher` | `string` | `"Fuzzy"` |
| `gopls.usePlaceholders` | `boolean` | `false` |
| `gopls.analysisProgressReporting` | `boolean` | `true` |
| `gopls.annotations` | `object` | — |
| `gopls.diagnosticsDelay` | `string` | `"1s"` |
| `gopls.diagnosticsTrigger` | `string` | `"Edit"` |
| `gopls.staticcheck` | `boolean` | `false` |
| `gopls.staticcheckProvided` | `boolean` | `false` |
| `gopls.vulncheck` | `string` | `"Prompt"` |
| `gopls.hoverKind` | `string` | `"FullDocumentation"` |
| `gopls.linkTarget` | `string` | `"pkg.go.dev"` |
| `gopls.linksInHover` | `boolean | string` | `true` |
| `gopls.hints` | `object` | `{}` |
| `gopls.moveDeclaration` | `boolean` | `false` |
| `gopls.moveType` | `boolean` | `false` |
| `gopls.importShortcut` | `string` | `"Both"` |
| `gopls.symbolMatcher` | `string` | `"FastFuzzy"` |
| `gopls.symbolScope` | `string` | `"all"` |
| `gopls.symbolStyle` | `string` | `"Dynamic"` |
| `gopls.newGoFileHeader` | `boolean` | `true` |
| `gopls.noSemanticNumber` | `boolean` | `false` |
| `gopls.noSemanticString` | `boolean` | `false` |
| `gopls.renameMovesSubpackages` | `boolean` | `false` |
| `gopls.semanticTokenModifiers` | `object` | — |
| `gopls.semanticTokenTypes` | `object` | — |
| `gopls.semanticTokens` | `boolean` | `false` |
| `gopls.verboseOutput` | `boolean` | `false` |

## gopls settings

## `gopls.buildFlags`

**Type:** `array` · **Default:** `[]`

buildFlags is the set of flags passed on to the build system when invoked.
It is applied to queries like `go list`, which is used when discovering files.
The most common use is to set `-tags`.

If unspecified, values of `go.buildFlags, go.buildTags` will be propagated.

## `gopls.directoryFilters`

**Type:** `array` · **Default:** `["-**/node_modules"]`

directoryFilters can be used to exclude unwanted directories from the
workspace. By default, all directories are included. Filters are an
operator, `+` to include and `-` to exclude, followed by a path prefix
relative to the workspace folder. They are evaluated in order, and
the last filter that applies to a path controls whether it is included.
The path prefix can be empty, so an initial `-` excludes everything.

DirectoryFilters also supports the `**` operator to match 0 or more directories.

Examples:

Exclude node_modules at current depth: `-node_modules`

Exclude node_modules at any depth: `-**/node_modules`

Include only project_a: `-` (exclude everything), `+project_a`

Include only project_a, but not node_modules inside it: `-`, `+project_a`, `-project_a/node_modules`

## `gopls.env`

**Type:** `object`

env adds environment variables to external commands run by `gopls`, most notably `go list`.

## `gopls.expandWorkspaceToModule`

**Type:** `boolean` · **Default:** `true`

(Experimental) expandWorkspaceToModule determines which packages are considered
"workspace packages" when the workspace is using modules.

Workspace packages affect the scope of workspace-wide operations. Notably,
gopls diagnoses all packages considered to be part of the workspace after
every keystroke, so by setting "ExpandWorkspaceToModule" to false, and
opening a nested workspace directory, you can reduce the amount of work
gopls has to do to keep your workspace up to date.

## `gopls.memoryMode`

**Type:** `string` · **Default:** `""`

(Experimental) obsolete, no effect

## `gopls.standaloneTags`

**Type:** `array` · **Default:** `["ignore"]`

standaloneTags specifies a set of build constraints that identify
individual Go source files that make up the entire main package of an
executable.

A common example of standalone main files is the convention of using the
directive `//go:build ignore` to denote files that are not intended to be
included in any package, for example because they are invoked directly by
the developer using `go run`.

Gopls considers a file to be a standalone main file if and only if it has
package name "main" and has a build directive of the exact form
"//go:build tag" or "// +build tag", where tag is among the list of tags
configured by this setting. Notably, if the build constraint is more
complicated than a simple tag (such as the composite constraint
`//go:build tag && go1.18`), the file is not considered to be a standalone
main file.

This setting is only supported when gopls is built with Go 1.16 or later.

## `gopls.templateExtensions`

**Type:** `array` · **Default:** `[]`

templateExtensions gives the extensions of file names that are treated
as template files. (The extension
is the part of the file name after the final dot.)

## `gopls.workspaceFiles`

**Type:** `array` · **Default:** `[]`

workspaceFiles configures the set of globs that match files defining the
logical build of the current workspace. Any on-disk changes to any files
matching a glob specified here will trigger a reload of the workspace.

This setting need only be customized in environments with a custom
GOPACKAGESDRIVER.

## `gopls.fileWatcher`

**Type:** `string` · **Default:** `"off"`

(Experimental) fileWatcher specifies the server-side file watching strategy used by gopls.

By default, this is set to "off", meaning gopls relies exclusively on the
language client (e.g., the editor) to send file change notifications.

Available options:
  - "off"      : Client-driven watching (default)
  - "fsnotify" : OS-level event notifications
  - "poll"     : Periodic directory scanning

**Options:**

- `fsnotify`
- `off`
- `poll`

## `gopls.gofumpt`

**Type:** `boolean` · **Default:** `false`

gofumpt indicates if we should run gofumpt formatting.

## `gopls.local`

**Type:** `string` · **Default:** `""`

local is the equivalent of the `goimports -local` flag, which puts
imports beginning with this string after third-party packages. It should
be the prefix of the import path whose imports should be grouped
separately.

It is used when tidying imports (during an LSP Organize
Imports request) or when inserting new ones (for example,
during completion); an LSP Formatting request merely sorts the
existing imports.

## `gopls.maxFileCacheBytes`

**Type:** `number` · **Default:** `0`

(Experimental) maxFileCacheBytes sets a soft limit on the file cache size in bytes.
If zero, the default budget is used.

The cache may temporarily use more than this amount.
Also, this parameter limits file contents; disk block usage
as measured by du(1) may be significantly higher.

## `gopls.memoryLimit`

**Type:** `number` · **Default:** `0`

(Experimental) memoryLimit sets a soft memory limit (in bytes) for the gopls process, via
runtime/debug.SetMemoryLimit. If non-positive (the default), no limit is set.

On large workspaces, a single edit that invalidates many
packages (for example a syntax error in a widely-imported
package) can make the heap briefly grow well above the
steady-state working set before the garbage collector
catches up, spiking memory and, on memory-constrained
machines, causing swapping. A soft limit makes the GC work
harder to stay near the limit, trading some CPU for a lower
memory peak.

The limit is soft and may be exceeded. Set it comfortably above the
steady-state working set, as too low a value causes excessive GC.

Unlike the GOMEMLIMIT environment variable, this setting is
strictly numeric; SI suffixes are not permitted.

## `gopls.codelenses`

**Type:** `object`

codelenses overrides the enabled/disabled state of each of gopls'
sources of [Code Lenses](codelenses.md).

Example Usage:

```json5
"gopls": {
...
  "codelenses": {
    "generate": false,  // Don't show the `go generate` lens.
  }
...
}
```

### `gopls.codelenses.generate`

**Type:** `boolean` · **Default:** `true`

`"generate"`: Run `go generate`

This codelens source annotates any `//go:generate` comments
with commands to run `go generate` in this directory, on
all directories recursively beneath this one.

See [Generating code](https://go.dev/blog/generate) for
more details.

### `gopls.codelenses.regenerate_cgo`

**Type:** `boolean` · **Default:** `true`

`"regenerate_cgo"`: Re-generate cgo declarations

This codelens source annotates an `import "C"` declaration
with a command to re-run the [cgo
command](https://pkg.go.dev/cmd/cgo) to regenerate the
corresponding Go declarations.

Use this after editing the C code in comments attached to
the import, or in C header files included by it.

### `gopls.codelenses.run_govulncheck`

**Type:** `boolean` · **Default:** `true`

`"run_govulncheck"`: Run govulncheck (legacy)

This codelens source annotates the `module` directive in a go.mod file
with a command to run Govulncheck asynchronously.

[Govulncheck](https://go.dev/blog/vuln) is a static analysis tool that
computes the set of functions reachable within your application, including
dependencies; queries a database of known security vulnerabilities; and
reports any potential problems it finds.

### `gopls.codelenses.test`

**Type:** `boolean` · **Default:** `false`

`"test"`: Run tests and benchmarks

This codelens source annotates each `Test` and `Benchmark`
function in a `*_test.go` file with a command to run it.

This source is off by default because VS Code has
a client-side custom UI for testing, and because progress
notifications are not a great UX for streamed test output.
See:
- golang/go#67400 for a discussion of this feature.
- https://github.com/joaotavora/eglot/discussions/1402
  for an alternative approach.

### `gopls.codelenses.tidy`

**Type:** `boolean` · **Default:** `true`

`"tidy"`: Tidy go.mod file

This codelens source annotates the `module` directive in a
go.mod file with a command to run [`go mod
tidy`](https://go.dev/ref/mod#go-mod-tidy), which ensures
that the go.mod file matches the source code in the module.

### `gopls.codelenses.upgrade_dependency`

**Type:** `boolean` · **Default:** `true`

`"upgrade_dependency"`: Update dependencies

This codelens source annotates the `module` directive in a
go.mod file with commands to:

- check for available upgrades,
- upgrade direct dependencies, and
- upgrade all dependencies transitively.

### `gopls.codelenses.vendor`

**Type:** `boolean` · **Default:** `true`

`"vendor"`: Update vendor directory

This codelens source annotates the `module` directive in a
go.mod file with a command to run [`go mod
vendor`](https://go.dev/ref/mod#go-mod-vendor), which
creates or updates the directory named `vendor` in the
module root so that it contains an up-to-date copy of all
necessary package dependencies.

### `gopls.codelenses.vulncheck`

**Type:** `boolean` · **Default:** `false`

(Experimental) `"vulncheck"`: Run govulncheck

This codelens source annotates the `module` directive in a go.mod file
with a command to run govulncheck synchronously.

[Govulncheck](https://go.dev/blog/vuln) is a static analysis tool that
computes the set of functions reachable within your application, including
dependencies; queries a database of known security vulnerabilities; and
reports any potential problems it finds.

## `gopls.completeFunctionCalls`

**Type:** `boolean` · **Default:** `true`

completeFunctionCalls enables function call completion.

When completing a statement, or when a function return type matches the
expected of the expression being completed, completion may suggest call
expressions (i.e. may include parentheses).

## `gopls.completionBudget`

**Type:** `string` · **Default:** `"100ms"`

(For Debugging) completionBudget is the soft latency goal for completion requests. Most
requests finish in a couple milliseconds, but in some cases deep
completions can take much longer. As we use up our budget we
dynamically reduce the search scope to ensure we return timely
results. Zero means unlimited.

## `gopls.experimentalPostfixCompletions`

**Type:** `boolean` · **Default:** `true`

(Experimental) experimentalPostfixCompletions enables artificial method snippets
such as "someSlice.sort!".

## `gopls.matcher`

**Type:** `string` · **Default:** `"Fuzzy"`

(Advanced) matcher sets the algorithm that is used when calculating completion
candidates.

**Options:**

- `CaseInsensitive`
- `CaseSensitive`
- `Fuzzy`

## `gopls.usePlaceholders`

**Type:** `boolean` · **Default:** `false`

placeholders enables placeholders for function parameters or struct
fields in completion responses.

## `gopls.analysisProgressReporting`

**Type:** `boolean` · **Default:** `true`

analysisProgressReporting controls whether gopls sends progress
notifications when construction of its index of analysis facts is taking a
long time. Cancelling these notifications will cancel the indexing task,
though it will restart after the next change in the workspace.

When a package is opened for the first time and heavyweight analyses such as
staticcheck are enabled, it can take a while to construct the index of
analysis facts for all its dependencies. The index is cached in the
filesystem, so subsequent analysis should be faster.

## `gopls.annotations`

**Type:** `object`

annotations specifies the various kinds of compiler
optimization details that should be reported as diagnostics
when enabled for a package by the "Toggle compiler
optimization details" (`gopls.gc_details`) command.

(Some users care only about one kind of annotation in their
profiling efforts. More importantly, in large packages, the
number of annotations can sometimes overwhelm the user
interface and exceed the per-file diagnostic limit.)

TODO(adonovan): rename this field to CompilerOptDetail.

### `gopls.annotations.bounds`

**Type:** `boolean` · **Default:** `true`

`"bounds"` controls bounds checking diagnostics.

### `gopls.annotations.escape`

**Type:** `boolean` · **Default:** `true`

`"escape"` controls diagnostics about escape choices.

### `gopls.annotations.inline`

**Type:** `boolean` · **Default:** `true`

`"inline"` controls diagnostics about inlining choices.

### `gopls.annotations.nil`

**Type:** `boolean` · **Default:** `true`

`"nil"` controls nil checks.

## `gopls.diagnosticsDelay`

**Type:** `string` · **Default:** `"1s"`

(Advanced) diagnosticsDelay controls the amount of time that gopls waits
after the most recent file modification before computing deep diagnostics.
Simple diagnostics (parsing and type-checking) are always run immediately
on recently modified packages.

This option must be set to a valid duration string, for example `"250ms"`.

## `gopls.diagnosticsTrigger`

**Type:** `string` · **Default:** `"Edit"`

(Experimental) diagnosticsTrigger controls when to run diagnostics.

**Options:**

- `Edit` — `"Edit"`: Trigger diagnostics on file edit and save. (default)
- `Save` — `"Save"`: Trigger diagnostics only on file save. Events like initial workspace load or configuration change will still trigger diagnostics.

## `gopls.staticcheck`

**Type:** `boolean` · **Default:** `false`

(Experimental) staticcheck configures the default set of analyses staticcheck.io.
These analyses are documented on
[Staticcheck's website](https://staticcheck.io/docs/checks/).

The "staticcheck" option has three values:
- false: disable all staticcheck analyzers
- true: enable all staticcheck analyzers
- unset: enable a subset of staticcheck analyzers
  selected by gopls maintainers for runtime efficiency
  and analytic precision.

Regardless of this setting, individual analyzers can be
selectively enabled or disabled using the `analyses` setting.

## `gopls.staticcheckProvided`

**Type:** `boolean` · **Default:** `false`

(Experimental)

## `gopls.vulncheck`

**Type:** `string` · **Default:** `"Prompt"`

(Experimental) vulncheck enables vulnerability scanning.

**Options:**

- `Imports` — `"Imports"`: In Imports mode, `gopls` will report vulnerabilities that affect packages directly and indirectly used by the analyzed main module.
- `Off` — `"Off"`: Disable vulnerability analysis.
- `Prompt` — `"Prompt"`: Vulncheck can be triggered via prompt.

## `gopls.hoverKind`

**Type:** `string` · **Default:** `"FullDocumentation"`

hoverKind controls the information that appears in the hover text.
SingleLine is intended for use only by authors of editor plugins.

**Options:**

- `FullDocumentation`
- `NoDocumentation`
- `SingleLine`
- `Structured` — `"Structured"` is a misguided experimental setting that returns a JSON hover format. This setting should not be used, as it will be removed in a future release of gopls.
- `SynopsisDocumentation`

## `gopls.linkTarget`

**Type:** `string` · **Default:** `"pkg.go.dev"`

linkTarget is the base URL for links to Go package
documentation returned by LSP operations such as Hover and
DocumentLinks and in the CodeDescription field of each
Diagnostic.

It might be one of:

* `"godoc.org"`
* `"pkg.go.dev"`

If company chooses to use its own `godoc.org`, its address can be used as well.

Modules matching the GOPRIVATE environment variable will not have
documentation links in hover.

## `gopls.linksInHover`

**Type:** `boolean | string` · **Default:** `true`

linksInHover controls the presence of documentation links in hover markdown.

**Options:**

- `false` — false: do not show links
- `true` — true: show links to the `linkTarget` domain
- `gopls` — `"gopls"`: show links to gopls' internal documentation viewer

## `gopls.hints`

**Type:** `object` · **Default:** `{}`

(Experimental) hints specify inlay hints that users want to see.
A full list of hints that gopls uses can be found in
[inlayHints](https://github.com/golang/tools/blob/master/gopls/doc/inlayHints.md).

### `gopls.hints.assignVariableTypes`

**Type:** `boolean` · **Default:** `false`

`"assignVariableTypes"` controls inlay hints for variable types in assign statements:
```go
	i« int», j« int» := 0, len(r)-1
```

### `gopls.hints.compositeLiteralFields`

**Type:** `boolean` · **Default:** `false`

`"compositeLiteralFields"` inlay hints for composite literal field names:
```go
	Point2D{«X: »1, «Y: »2}

	Outer{«Embedded.»Field: 0}
```

### `gopls.hints.compositeLiteralTypes`

**Type:** `boolean` · **Default:** `false`

`"compositeLiteralTypes"` controls inlay hints for composite literal types:
```go
	for _, c := range []struct {
		in, want string
	}{
		«struct{ in string; want string }»{"Hello, world", "dlrow ,olleH"},
	}
```

### `gopls.hints.constantValues`

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

### `gopls.hints.functionTypeParameters`

**Type:** `boolean` · **Default:** `false`

`"functionTypeParameters"` inlay hints for implicit type parameters on generic functions:
```go
	myFoo«[int, string]»(1, "hello")
```

### `gopls.hints.parameterNames`

**Type:** `boolean` · **Default:** `false`

`"parameterNames"` controls inlay hints for parameter names:
```go
	parseInt(« str: » "123", « radix: » 8)
```

### `gopls.hints.rangeVariableTypes`

**Type:** `boolean` · **Default:** `false`

`"rangeVariableTypes"` controls inlay hints for variable types in range statements:
```go
	for k« int», v« string» := range []string{} {
		fmt.Println(k, v)
	}
```

### `gopls.hints.ignoredError`

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

## `gopls.moveDeclaration`

**Type:** `boolean` · **Default:** `false`

(Experimental) moveDeclaration enables producing Move Declaration codeactions. The implementation
is unfinished so we use this setting to gate its use.

## `gopls.moveType`

**Type:** `boolean` · **Default:** `false`

(Experimental) moveType enables producing Move Type codeactions. The implementation
is unfinished so we use this setting to gate its use.

## `gopls.importShortcut`

**Type:** `string` · **Default:** `"Both"`

importShortcut specifies whether import statements should link to
documentation or go to definitions.

**Options:**

- `Both`
- `Definition`
- `Link`

## `gopls.symbolMatcher`

**Type:** `string` · **Default:** `"FastFuzzy"`

(Advanced) symbolMatcher sets the algorithm that is used when finding workspace symbols.

**Options:**

- `CaseInsensitive`
- `CaseSensitive`
- `FastFuzzy`
- `Fuzzy`

## `gopls.symbolScope`

**Type:** `string` · **Default:** `"all"`

symbolScope controls which packages are searched for workspace/symbol
requests. When the scope is "workspace", gopls searches only workspace
packages. When the scope is "all", gopls searches all loaded packages,
including dependencies and the standard library.

**Options:**

- `all` — `"all"` matches symbols in any loaded package, including dependencies.
- `workspace` — `"workspace"` matches symbols in workspace packages only.

## `gopls.symbolStyle`

**Type:** `string` · **Default:** `"Dynamic"`

(Advanced) symbolStyle controls how symbols are qualified in symbol responses.

Example Usage:

```json5
"gopls": {
...
  "symbolStyle": "Dynamic",
...
}
```

**Options:**

- `Dynamic` — `"Dynamic"` uses whichever qualifier results in the highest scoring match for the given symbol query. Here a "qualifier" is any "/" or "." delimited suffix of the fully qualified symbol. i.e. "to/pkg.Foo.Field" or just "Foo.Field".
- `Full` — `"Full"` is fully qualified symbols, i.e. "path/to/pkg.Foo.Field".
- `Package` — `"Package"` is package qualified symbols i.e. "pkg.Foo.Field".

## `gopls.newGoFileHeader`

**Type:** `boolean` · **Default:** `true`

newGoFileHeader enables automatic insertion of the copyright comment
and package declaration in a newly created Go file.

## `gopls.noSemanticNumber`

**Type:** `boolean` · **Default:** `false`

> **Deprecated:** use SemanticTokenTypes["number"] = false instead. See golang/vscode-go#3632. 

(Experimental) noSemanticNumber turns off the sending of the semantic token 'number'

Deprecated: Use SemanticTokenTypes["number"] = false instead. See
golang/vscode-go#3632.

## `gopls.noSemanticString`

**Type:** `boolean` · **Default:** `false`

> **Deprecated:** use SemanticTokenTypes["string"] = false instead. See golang/vscode-go#3632 

(Experimental) noSemanticString turns off the sending of the semantic token 'string'

Deprecated: Use SemanticTokenTypes["string"] = false instead. See
golang/vscode-go#3632

## `gopls.renameMovesSubpackages`

**Type:** `boolean` · **Default:** `false`

(Experimental) renameMovesSubpackages enables Rename operations on packages to
move subdirectories of the target package.

## `gopls.semanticTokenModifiers`

**Type:** `object`

(Experimental) semanticTokenModifiers configures the semantic token modifiers. It allows
disabling modifiers by setting each value to false.
By default, all modifiers are enabled.

## `gopls.semanticTokenTypes`

**Type:** `object`

(Experimental) semanticTokenTypes configures the semantic token types. It allows
disabling types by setting each value to false.
By default, all types are enabled.

## `gopls.semanticTokens`

**Type:** `boolean` · **Default:** `false`

(Experimental) semanticTokens determines whether gopls will return a
SemanticTokensProvider at initialization, or respond
to requests for semantic tokens.

This setting being `false` won't necessary disable the client's calls
for semantic tokens. If you want that, it would need to be configured in
the client. For example, in VSCode, this would disable all Go semantic
token calls to the LSP server:

```json5
"[go]": {
    "editor.semanticHighlighting.enabled": false,
}
```

## `gopls.verboseOutput`

**Type:** `boolean` · **Default:** `false`

(For Debugging) verboseOutput enables additional debug logging.

