---
title: coc-golang
description: Go language support for coc.nvim, powered by gopls.
---

`coc-golang` brings Go development to Vim and Neovim through
[coc.nvim](https://github.com/neoclide/coc.nvim). It uses the official
[gopls](https://go.dev/gopls/) language server for code intelligence and adds
commands for testing, building, formatting, linting, and everyday Go project
tasks.

## What you get

- **Code intelligence** — completion, hover, diagnostics, navigation,
  references, rename, and code actions, all from `gopls`.
- **Formatting and imports** — format Go code and add or organize imports.
- **Build and checks** — build, run, vet, lint, and scan for known
  vulnerabilities.
- **Tests and benchmarks** — run tests at package, file, or cursor scope;
  repeat the last run; collect coverage; run benchmarks.
- **Project workflows** — manage modules and workspaces, install Go tools,
  generate tests, edit struct tags, and generate interface implementations.

## Where to start

- [Getting started](./getting-started) — install the extension and run your
  first command.
- [Keybindings and recipes](./keybindings) — handy mappings for common actions.
- [Troubleshooting](./troubleshooting) — fix common issues.
- [Reference](./reference/commands) — every command, setting, and tool.

## How commands are run

Every feature is a `coc.nvim` command. Run it with `:CocCommand`, for example:

```vim
:CocCommand go.test.package
```
