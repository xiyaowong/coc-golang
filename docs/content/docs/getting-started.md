---
title: Getting started
description: Install coc-golang and run your first Go command.
---

## Requirements

- Vim or Neovim with [coc.nvim](https://github.com/neoclide/coc.nvim) `0.0.82`
  or newer.
- Node.js `22.18` or newer.
- [Go](https://go.dev/dl/).

## 1. Install the extension

```vim
:CocInstall coc-golang
```

## 2. Open a Go file

Opening a Go file activates the extension and starts `gopls`. If `gopls` is not
installed, coc-golang offers to install it. Install or update it at any time:

```vim
:CocCommand go.gopls.install
```

## 3. Run a command

Every feature is a command, run with `:CocCommand`. Start with the tests of the
current package:

```vim
:CocCommand go.test.package
```

A command either runs in a coc.nvim terminal named **Go** (for things like
`go run`, `go test`, and `go get`), or prints to the **Go** output channel. Use
`:CocCommand go.test.showOutput` to bring the Go terminal to the front.

## Common commands to try

| Task | Command |
| --- | --- |
| Run the tests in the current file | `go.test.file` |
| Run the test under the cursor | `go.test.cursor` |
| Format the current package | `go.fmt.package` |
| Organize imports | `go.import.organize` |
| Build the current package | `go.build.package` |
| Show the Go environment | `go.env` |
| Install a Go tool | `go.tools.install` |

See the [command reference](./reference/commands) for all of them.

## Show test coverage

Run the tests of the current package with coverage:

```vim
:CocCommand go.test.coverage
```

Covered code is highlighted with `CocCoverageCovered` and uncovered code with
`CocCoverageUncovered`. Each covered block is also labelled with its execution
count, as `--374--`, or `--3-- --1--` when several blocks start on one line.

`go.coverMode` decides what those counts mean. `count` and `atomic` report real
numbers. The default leaves the choice to `go test`, which uses `set` for
package tests — that only records whether a block ran, so every count reads
`--1--`. Set `go.coverShowCounts` to `false` to hide the labels.

Running the command again, or saving an edited Go file, clears the highlights.

### Reuse or inspect a profile

coc-golang keeps the profile of each run, so you can go back to one without
rerunning the tests.

- `go.apply.coverprofile` — highlight again from a recorded profile, or from a
  path of your own.
- `go.show.coverprofile` — open a recorded profile, or a path of your own, in a
  buffer.

## Configure the extension

Settings live in `coc-settings.json` (run `:CocConfig` to open it). For
example:

```json
{
  "go.useLanguageServer": true,
  "go.formatTool": "default",
  "go.lintTool": "staticcheck",
  "go.testTimeout": "30s"
}
```

Setting names and types follow
[vscode-go](https://github.com/golang/vscode-go). See the
[settings reference](./reference/settings) and
[gopls settings](./reference/gopls-settings) for the full list.
