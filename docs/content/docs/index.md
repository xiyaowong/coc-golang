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
- **Diagnostics** — errors and warnings from `gopls` and from build, vet, and
  lint runs, each carrying the analyzer or check code, a link to its
  documentation, and the range the tool pointed at.
- **Tests and benchmarks** — run tests at package, file, or cursor scope;
  browse and run them from a tree view with pass/fail status; repeat the last
  run; collect coverage and show each block's execution count; run benchmarks.
- **Project workflows** — manage modules and workspaces, install Go tools,
  generate tests, edit struct tags, and generate interface implementations.
- **Package search** — search pkg.go.dev and `get`, `install`, or `download`
  what you find.

## Where to start

- [Getting started](./getting-started) — install the extension and run your
  first command.
- [Test explorer](./test-explorer) — browse and run tests from a tree view.
- [Package search](./package-search) — find packages on pkg.go.dev.
- [Converters](./convert) — generate Go types from JSON or a JSON Schema.
- [Troubleshooting](./troubleshooting) — fix common issues.
- [Reference](./reference/commands) — every command, setting, and tool.

## How commands are run

Every feature is a `coc.nvim` command. Run it with `:CocCommand`, for example:

```vim
:CocCommand go.test.package
```
