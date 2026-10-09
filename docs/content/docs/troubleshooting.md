---
title: Troubleshooting
description: Fix common issues with coc-golang.
---

## gopls is not found

coc-golang needs the `gopls` language server. When it is missing, opening a Go
file prompts you to install it. Install or update it manually with:

```vim
:CocCommand go.gopls.install
```

Set `go.autoInstallGopls` to `false` to stop being asked.

To restart a running `gopls` (after changing settings, for example):

```vim
:CocCommand go.languageserver.restart
```

## A command says a tool is not installed

Some features need an extra Go tool — for example struct tags need
`gomodifytags`, and interface generation needs `impl`. When a tool is missing
the command tells you which one to install:

```vim
:CocCommand go.tools.install.gomodifytags
```

Run `:CocCommand go.tools.install` to pick from a list, or
`:CocCommand go.locate.tools` to see which tools are already installed. See the
[Go tools reference](./reference/tools).

When a command needs a missing tool, it offers to install it. Set
`go.autoInstallTools` to `false` to be told about the missing tool instead.

## Where did the output go?

Commands that run `go` in a terminal use a coc.nvim terminal named **Go**;
other commands print to the **Go** output channel.

- `:CocCommand go.test.showOutput` shows the Go terminal.
- `:CocCommand go.test.cancel` stops the running test.
- In coc.nvim, `:CocList output` lists the output channels, including **Go**.

## Wrong Go version or GOROOT is used

Go commands and `gopls` use the `go` binary from your `PATH` unless you point
them elsewhere.

- `:CocCommand go.env` shows the Go environment, and `go.version` shows the Go
  and gopls versions.
- `:CocCommand go.environment.choose` sets `go.goroot` to pick a specific Go
  installation.
- `go.gopath`, `go.goroot`, and `go.toolsEnvVars` override the environment for
  Go commands, `gopls`, and tool installs. `go.alternateTools` points at
  alternative binaries.

See the [settings reference](./reference/settings).

## Language features are off but commands still work

If you only want the commands (tests, build, format) without `gopls`, set
`go.useLanguageServer` to `false`. Diagnostics, completion, and navigation are
then unavailable, and formatting falls back to `goimports` unless you set
`go.formatTool`.

## Vulnerability warnings

`gopls` reports known vulnerabilities in your dependencies. Toggle them with:

```vim
:CocCommand go.vulncheck.toggle
```

The `go.diagnostic.vulncheck` setting (`Imports` or `Off`) controls the same
behaviour.

## Editor keeps asking about a `gopls` daemon

By default coc-golang runs `gopls` through its shared daemon. If that causes
problems in your environment, set `go.goplsUseDaemon` to `false` to run a
private `gopls` per session.
