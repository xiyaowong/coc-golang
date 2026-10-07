<div align="center">

# coc-golang

Go language support for [coc.nvim](https://github.com/neoclide/coc.nvim), powered by the official [gopls](https://go.dev/gopls/) language server and Go tools.

[![coc.nvim](https://img.shields.io/badge/coc.nvim-extension-5b9bd5?style=flat-square)](https://github.com/neoclide/coc.nvim)
[![Go](https://img.shields.io/badge/Go-tools-00ADD8?style=flat-square&logo=go&logoColor=white)](https://go.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D22.18-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)

[Install](#installation) · [Features](#features) · [Commands](#commands) · [Configuration](#configuration) · [Development](#development)

</div>

## Overview

`coc-golang` brings Go development features to Vim and Neovim through coc.nvim. It uses `gopls` for language intelligence and provides commands for testing, building, formatting, linting, vulnerability checks, and common Go project tasks.

## Installation

### Requirements

- Vim or Neovim with [coc.nvim](https://github.com/neoclide/coc.nvim) `0.0.83-next.27` or newer
- Node.js `22.18` or newer
- [Go](https://go.dev/dl/)

Install the extension from Vim or Neovim:

```vim
:CocInstall coc-golang
```

Open a Go file to activate the extension. If `gopls` is not installed, coc-golang prompts you to install it. You can also install it at any time with:

```vim
:CocCommand go.gopls.install
```

## Features

- **Language intelligence:** completion, hover, signature help, diagnostics, navigation, references, rename, code actions, and document symbols through `gopls`.
- **Formatting and imports:** format Go code and add or organize imports.
- **Build and checks:** build, run, vet, lint, and scan packages or workspaces for known vulnerabilities.
- **Tests and benchmarks:** run tests at package, workspace, file, or cursor scope; repeat the previous run; collect coverage; and run benchmarks.
- **Project workflows:** manage modules and workspaces, install Go tools, generate code or tests, edit struct tags, and generate interface implementations.
- **Go environment:** inspect Go settings and configure environments for `gopls`, Go commands, and installed tools.

`gopls` handles language features. Test and Go command output is shown in coc.nvim's **Go** output channel.

## Commands

Run commands with `:CocCommand`, for example:

```vim
:CocCommand go.test.package
```

### Tests and benchmarks

| Task | Commands |
| --- | --- |
| Run tests | `go.test.package`, `go.test.workspace`, `go.test.file`, `go.test.cursor`, `go.subtest.cursor` |
| Choose or repeat tests | `go.test.explorer`, `go.test.cursorOrPrevious`, `go.test.previous` |
| Coverage and test controls | `go.test.coverage`, `go.test.cancel`, `go.test.showOutput`, `go.toggle.test.file` |
| Run benchmarks | `go.benchmark.package`, `go.benchmark.file`, `go.benchmark.cursor` |
| Generate tests | `go.test.generate.file`, `go.test.generate.package`, `go.test.generate.function` |

Test generation requires `gotests`. The test explorer is a coc.nvim quick-pick selector; persistent VS Code test explorer UI is not included.

### Build, checks, and code

| Task | Commands |
| --- | --- |
| Build and run | `go.build.package`, `go.build.workspace`, `go.run`, `go.generate.package` |
| Vet and lint | `go.vet.package`, `go.vet.workspace`, `go.lint.package`, `go.lint.workspace` |
| Vulnerability checks | `go.vulncheck.package`, `go.vulncheck.workspace`, `go.vulncheck.toggle` |
| Format and imports | `go.fmt.package`, `go.import.organize`, `go.import.add` |
| Modules and dependencies | `go.mod.init`, `go.mod.tidy`, `go.mod.vendor`, `go.work.sync`, `go.get.package`, `go.install.package`, `go.browse.packages` |
| Struct tags and interfaces | `go.tags.add`, `go.tags.remove`, `go.tags.clear`, `go.impl.cursor` |

`govulncheck` is required for vulnerability scans, `gomodifytags` for struct tags, and `impl` for interface implementation generation.

### Go environment and tools

Use `go.env`, `go.gopath`, `go.goroot`, `go.version`, and `go.environment.choose` to inspect or select the Go environment. Use `go.locate.tools` to locate installed tools, `go.tools.install` to choose tools to install, or `go.tools.install.<tool>` to install a specific tool. `go.gopls.install` installs `gopls`, and `go.languageserver.restart` restarts it.

Optional tools include `dlv`, `goimports`, `staticcheck`, `govulncheck`, `gomodifytags`, `gotests`, `impl`, `golint`, `golangci-lint`, `golangci-lint-v2`, `revive`, `gofumpt`, and `goformat`. Delve can be used with external DAP clients; coc-golang does not provide a debug adapter UI.

## Configuration

Add settings to `coc-settings.json`. For example:

```json
{
  "go.useLanguageServer": true,
  "go.autoInstallGopls": true,
  "go.languageServerFlags": [],
  "go.goplsUseDaemon": true,
  "gopls": {},
  "go.buildFlags": [],
  "go.buildTags": "",
  "go.formatTool": "default",
  "go.testTimeout": "30s",
  "go.testOnSave": false,
  "go.diagnostic.vulncheck": "Prompt"
}
```

Setting names, types, and defaults follow [vscode-go](https://github.com/golang/vscode-go). The `gopls` setting accepts gopls options (including dotted keys). Go-specific settings such as build flags, build tags, inlay hints, vulnerability checks, and code lenses are forwarded to gopls unless explicitly set there.

Some settings to know:

- **Go environment:** `go.goroot`, `go.gopath`, `go.toolsEnvVars`, `go.toolsGopath`, and `go.alternateTools` control the environment and executable paths used by Go commands, `gopls`, and tool installs. Set `go.terminal.activateEnvironment` to export the configured environment to Neovim.
- **Formatting:** `go.formatTool` supports `gofmt`, `goimports`, `goformat`, `gofumpt`, and `custom`. With `go.useLanguageServer: false`, the default formatter uses `goimports`.
- **Checks:** build and vet on save run when `go.useLanguageServer` is `false`. Lint on save runs when `go.lintTool` is configured. Available lint tools are `staticcheck`, `golint`, `golangci-lint`, `golangci-lint-v2`, and `revive`; diagnostics are reported by coc.nvim.
- **Tests:** `go.testFlags` and `go.testTags` fall back to `go.buildFlags` and `go.buildTags`. `go.testTimeout` supplies the test timeout, and `go.testEnvFile` is loaded before `go.testEnvVars`.
- **Language server:** set `go.useLanguageServer` to `false` to disable `gopls` and use Go commands and formatters directly.

### Migrating from earlier versions

| Previous setting | Replacement |
| --- | --- |
| `go.goPath` | `go.alternateTools.go` |
| `go.goplsPath` | `go.alternateTools.gopls` |
| `go.goplsArgs` | `go.languageServerFlags` |
| `go.goplsOptions` | `gopls` |
| `go.goplsEnv`, `go.goEnv`, `go.gobin` | `go.toolsEnvVars` |
| `go.testEnv` | `go.testEnvVars` |
| Boolean `go.buildOnSave` | `"package"`, `"workspace"`, or `"off"` |

## Development

Install dependencies, then build and type-check:

```sh
npm install
npm run build
npm run typecheck
```

The build writes the extension bundles to `lib/`.

## Scope

The persistent VS Code test explorer, Delve debug adapter UI, survey and telemetry, coverage overlays, and rich diagnostic visualization are not included. Update checks cover `gopls` only.
