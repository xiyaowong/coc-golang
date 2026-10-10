<div align="center">

<img src="https://raw.githubusercontent.com/xiyaowong/coc-golang/main/assets/logo.svg" alt="coc-golang logo" width="160" height="160" />

<sub>Logo concept by <a href="https://github.com/xiyaowong">@xiyaowong</a>, drawn with AI</sub>

# coc-golang

Go language support for [coc.nvim](https://github.com/neoclide/coc.nvim), powered by the official [gopls](https://go.dev/gopls/) language server and Go tools.

[![coc.nvim](https://img.shields.io/badge/coc.nvim-extension-5b9bd5?style=flat-square)](https://github.com/neoclide/coc.nvim)
[![Go](https://img.shields.io/badge/Go-tools-00ADD8?style=flat-square&logo=go&logoColor=white)](https://go.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D22.18-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)

[Install](#-installation) · [Features](#-features) · [Commands](#-commands) · [Configuration](#-configuration) · [Development](#-development)

</div>

## 🧭 Overview

`coc-golang` brings Go development features to Vim and Neovim through coc.nvim. It uses `gopls` for language intelligence and provides commands for testing, building, formatting, linting, vulnerability checks, and common Go project tasks.

## 📦 Installation

### 📋 Requirements

- Vim or Neovim with [coc.nvim](https://github.com/neoclide/coc.nvim) `0.0.82` or newer
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

## ✨ Features

- 🧠 **Language intelligence:** completion, hover, signature help, diagnostics, navigation, references, rename, code actions, and document symbols through `gopls`.
- 🧹 **Formatting and imports:** format Go code and add or organize imports.
- 🏗️ **Build and checks:** build, run, vet, lint, and scan packages or workspaces for known vulnerabilities.
- 🧪 **Tests and benchmarks:** run tests at package, workspace, file, or cursor scope; browse and run them from a tree view with pass/fail status; repeat the previous run; collect coverage; and run benchmarks.
- 📁 **Project workflows:** manage modules and workspaces, install Go tools, generate code or tests, edit struct tags, and generate interface implementations.
- 🔄 **Converters:** generate Go types from a JSON Schema or from JSON.
- 🌱 **Go environment:** inspect Go settings and configure environments for `gopls`, Go commands, and installed tools.

`gopls` handles language features. `go run`, `go test`, benchmarks, `go doc`, `go get`, `go install` and `go mod init` run in a coc.nvim terminal named **Go**; other command output is shown in the **Go** output channel.

## 💻 Commands

Run commands with `:CocCommand`, for example:

```vim
:CocCommand go.test.package
```

The ones you'll reach for most:

| Task | Command |
| --- | --- |
| Run tests in the current package | `go.test.package` |
| Run the test at the cursor | `go.test.cursor` |
| Run the tests in the current file | `go.test.file` |
| Build the current package | `go.build.package` |
| Vet the current package | `go.vet.package` |
| Format the current package | `go.fmt.package` |
| Organize imports | `go.import.organize` |
| Show the Go environment | `go.env` |
| Install a Go tool | `go.tools.install` |

Every `go.*` command — all 81, grouped by area — is in the [command reference](https://xiyaowong.github.io/coc-golang/docs/reference/commands).

Some commands need an extra tool: test generation uses `gotests`, struct tags use `gomodifytags`, and interface generation uses `impl`. Vulnerability analysis is provided by `gopls`.

### 🌳 Test explorer

`go.test.explorer.show` opens a **Go Tests** tree view of your workspace's tests and benchmarks, nested folder → package → file → test → subtest. Every node runs — a file, package, or folder runs everything beneath it; tests report pass/fail status; and each node jumps to the file and line it is defined in. Press `f` to filter by name. `go.test.explorer` remains as the quick-pick alternative.

### 🔄 Converters

- `go.convert.jsonSchema` Generate Go types from a JSON Schema.
- `go.convert.jsonToGo` Generate Go types from JSON.

`go.convert.jsonSchema` runs `go-jsonschema` on the active JSON Schema file (or a schema you pick from the workspace), prompting for the package name and the output file. Schemas that use the `date` or `date-time` formats make the generated code import `github.com/atombender/go-jsonschema/pkg/types`.

`go.convert.jsonToGo` opens a scratch JSON buffer and a scratch Go buffer side by side, regenerating the Go types as you type; parse errors appear in the output buffer. The JSON starts from one of:

- **From clipboard:** the system clipboard contents.
- **From a JSON file:** a `.json` file picked from the workspace, or a path you type.
- **From scratch:** an empty buffer.

Closing either buffer's window ends the session.

The generated Go matches the defaults of [`mholt/json-to-go`](https://github.com/mholt/json-to-go) and needs no extra tool.

### 🔖 Struct tags

`go.tags.add`, `go.tags.remove`, and `go.tags.clear` run `gomodifytags` on the struct under the cursor:

- **Whole struct:** the cursor is on the `type ... struct {` line, the closing `}`, or a field's indentation.
- **Single field:** the cursor is on a field.
- **Selected fields:** in visual mode, the selection.

### 🌱 Go environment and tools

Use `go.env`, `go.gopath`, `go.goroot`, `go.version`, and `go.environment.choose` to inspect or select the Go environment. Use `go.locate.tools` to locate installed tools, `go.tools.install` to choose tools to install, or `go.tools.install.<tool>` to install a specific tool. `go.gopls.install` installs `gopls`, and `go.languageserver.restart` restarts it.

Optional tools include `dlv`, `goimports`, `staticcheck`, `gomodifytags`, `gotests`, `impl`, `golint`, `golangci-lint`, `golangci-lint-v2`, `revive`, `gofumpt`, `goformat`, and `go-jsonschema`. Delve can be used with external DAP clients; coc-golang does not provide a debug adapter UI.

## 🔧 Configuration

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
  "go.diagnostic.vulncheck": "Imports"
}
```

Setting names, types, and defaults follow [vscode-go](https://github.com/golang/vscode-go). The `gopls` setting accepts gopls options (including dotted keys). Go-specific settings such as build flags, build tags, inlay hints, vulnerability checks, and code lenses are forwarded to gopls unless explicitly set there. Vulnerability analysis uses gopls' import-based diagnostics and built-in `govulncheck` code lens/quick fix; use `go.vulncheck.toggle` to enable or disable import-based diagnostics.

Some settings to know:

- **Go environment:** `go.goroot`, `go.gopath`, `go.toolsEnvVars`, `go.toolsGopath`, and `go.alternateTools` control the environment and executable paths used by Go commands, `gopls`, and tool installs. Set `go.terminal.activateEnvironment` to export the configured environment to Neovim.
- **Formatting:** `go.formatTool` supports `gofmt`, `goimports`, `goformat`, `gofumpt`, and `custom`. With `go.useLanguageServer: false`, the default formatter uses `goimports`.
- **Checks:** build and vet on save run when `go.useLanguageServer` is `false`. Lint on save runs when `go.lintTool` is configured. Available lint tools are `staticcheck`, `golint`, `golangci-lint`, `golangci-lint-v2`, and `revive`; diagnostics are reported by coc.nvim.
- **Tests:** `go.testFlags` and `go.testTags` fall back to `go.buildFlags` and `go.buildTags`. `go.testTimeout` supplies the test timeout, and `go.testEnvFile` is loaded before `go.testEnvVars`.
- **Language server:** set `go.useLanguageServer` to `false` to disable `gopls` and use Go commands and formatters directly.

## 🚧 Development

Install dependencies, then build and type-check:

```sh
npm install
npm run build
npm run typecheck
```

The build writes the extension bundles to `lib/`.

### 🤖 AI-assisted

Most of the code is AI-generated. Direction was manual.

## 📝 Changelog

See [CHANGELOG.md](CHANGELOG.md).

## 🎯 Scope

The VS Code test explorer's run/debug gutter and status-bar widgets, the Delve debug adapter UI, survey and telemetry, coverage overlays, and rich diagnostic visualization are not included. Update checks cover `gopls` only.
