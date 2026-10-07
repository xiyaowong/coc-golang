# coc-golang

Go language support for [coc.nvim](https://github.com/neoclide/coc.nvim), built
around the official [gopls](https://go.dev/gopls/) language server.

## Installation

Install `gopls` and the Go toolchain, then install the extension in coc.nvim:

```vim
:CocInstall coc-golang
```

The extension starts `gopls` for Go source, module, and workspace files. It does
not install tools automatically. To install or update `gopls` using the active
Go toolchain, run `:CocCommand go.gopls.install`.

## Commands

- `go.test.package` — run tests in the current Go package.
- `go.test.workspace` — run tests for all packages in the workspace.
- `go.test.cursor` — run the test, benchmark, or example containing the cursor.
- `go.test.previous` — repeat the previous test command.
- `go.gopls.install` — install or update `gopls`.

Test output is written to the `Go` output channel. Test commands use `go` from
`PATH` and run from the current file's directory, except for workspace tests.

## Configuration

All settings use the `go.` prefix in coc.nvim's configuration:

```json
{
  "go.goplsPath": "gopls",
  "go.goplsArgs": [],
  "go.goplsEnv": {},
  "go.goplsOptions": {},
  "go.testFlags": []
}
```

`goplsPath` may be an absolute or `PATH`-resolved executable name. Changes to
the `gopls` settings restart the language server.
