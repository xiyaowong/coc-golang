---
title: Getting started
description: Install coc-golang and run your first Go command.
---

## Requirements

- Vim or Neovim with [coc.nvim](https://github.com/neoclide/coc.nvim) `0.0.82`
  or newer.
- Node.js `22.18` or newer.
- [Go](https://go.dev/dl/).

## Install

Install the extension from Vim or Neovim:

```vim
:CocInstall coc-golang
```

Open a Go file to activate it. The first time you open a Go file, `gopls` is
started; if it is not installed yet, coc-golang offers to install it. You can
also install or update it at any time:

```vim
:CocCommand go.gopls.install
```

## Run a command

All features are commands. Run one with `:CocCommand`:

```vim
:CocCommand go.test.package
```

A command either runs in a coc.nvim terminal named **Go** (for things like
`go run`, `go test`, and `go get`), or prints to the **Go** output channel.
Use `:CocCommand go.test.showOutput` to bring the Go terminal to the front.

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

Setting names, types, and defaults follow
[vscode-go](https://github.com/golang/vscode-go). See the
[settings reference](./reference/settings) and
[gopls settings](./reference/gopls-settings) for the full list.
