---
title: Commands
description: Every go.* command, grouped by area.
---

<!-- Generated from package.json (and src/tools.ts). Do not edit by hand. -->
## Commands

All 76 commands are run with `:CocCommand <id>`.

### Tests & benchmarks

| Command | What it does |
| --- | --- |
| `go.test.package` | Test Go Package |
| `go.test.explorer` | Pick a Go Test |
| `go.test.workspace` | Test Go Workspace |
| `go.test.file` | Test Go File |
| `go.test.cursor` | Test Go Function at Cursor |
| `go.test.cursorOrPrevious` | Test Go Function at Cursor or Repeat Previous |
| `go.subtest.cursor` | Test Go Subtest at Cursor |
| `go.benchmark.package` | Benchmark Go Package |
| `go.benchmark.cursor` | Benchmark Go Function at Cursor |
| `go.benchmark.file` | Benchmark Go File |
| `go.test.coverage` | Test Go Package with Coverage |
| `go.toggle.test.file` | Toggle Go Test File |
| `go.test.previous` | Repeat Previous Go Test |
| `go.test.generate.file` | Generate Tests for Go File |
| `go.test.generate.package` | Generate Tests for Go Package |
| `go.test.generate.function` | Generate Test for Go Function |
| `go.test.cancel` | Cancel Go Tests |
| `go.test.showOutput` | Show Go Test Output |

### Build, vet, lint, run

| Command | What it does |
| --- | --- |
| `go.build.package` | Build Go Package |
| `go.vet.package` | Vet Go Package |
| `go.run` | Run Go Package |
| `go.build.workspace` | Build Go Workspace |
| `go.vet.workspace` | Vet Go Workspace |
| `go.lint.package` | Lint Go Package |
| `go.lint.workspace` | Lint Go Workspace |
| `go.vulncheck.toggle` | Toggle Vulncheck |
| `go.generate.package` | Generate Go Package |

### Formatting & imports

| Command | What it does |
| --- | --- |
| `go.fmt.package` | Format Go Package |
| `go.import.organize` | Organize Go Imports |
| `go.import.add` | Add Go Import |

### Modules

| Command | What it does |
| --- | --- |
| `go.mod.tidy` | Tidy Go Modules |
| `go.mod.vendor` | Vendor Go Modules |
| `go.mod.download` | Download Go Modules |
| `go.mod.init` | Initialize Go Module |
| `go.mod.verify` | Verify Go Modules |
| `go.mod.why` | Explain Go Dependency |
| `go.mod.graph` | Show Go Module Graph |
| `go.mod.edit.require` | Add Go Module Requirement |
| `go.mod.edit.replace` | Replace Go Module |
| `go.mod.edit.droprequire` | Drop Go Module Requirement |

### Workspaces

| Command | What it does |
| --- | --- |
| `go.work.sync` | Sync Go Workspace |
| `go.work.init` | Initialize Go Workspace |
| `go.work.use` | Add Module to Go Workspace |

### Dependencies & packages

| Command | What it does |
| --- | --- |
| `go.get.package` | Get Go Package |
| `go.get.upgrade` | Upgrade Go Dependencies |
| `go.install.package` | Install Go Package |
| `go.browse.packages` | Browse Go Packages |

### Struct tags & code generation

| Command | What it does |
| --- | --- |
| `go.tags.add` | Add Go Struct Tags |
| `go.tags.remove` | Remove Go Struct Tags |
| `go.tags.clear` | Clear Go Struct Tags |
| `go.impl.cursor` | Implement Go Interface |

### Environment & tools

| Command | What it does |
| --- | --- |
| `go.env` | Show Go Environment |
| `go.gopath` | Show GOPATH |
| `go.goroot` | Show GOROOT |
| `go.environment.choose` | Choose Go Environment |
| `go.version` | Show Go Version |
| `go.tools.install` | Install Go Tools |
| `go.locate.tools` | Locate Go Tools |
| `go.languageserver.restart` | Restart gopls |
| `go.gopls.install` | Install or Update gopls |
| `go.tools.install.dlv` | Install Delve |
| `go.tools.install.goimports` | Install goimports |
| `go.tools.install.staticcheck` | Install Staticcheck |
| `go.tools.install.gomodifytags` | Install gomodifytags |
| `go.tools.install.gotests` | Install gotests |
| `go.tools.install.impl` | Install impl |
| `go.tools.install.gopls` | Install gopls |
| `go.tools.install.golint` | Install golint |
| `go.tools.install.golangci-lint` | Install golangci-lint |
| `go.tools.install.golangci-lint-v2` | Install golangci-lint v2 |
| `go.tools.install.revive` | Install revive |
| `go.tools.install.gofumpt` | Install gofumpt |
| `go.tools.install.goformat` | Install goformat |
| `go.convert.jsonSchema` | Generate Go Types from JSON Schema |
| `go.convert.jsonToGo` | Generate Go Types from JSON |
| `go.tools.install.go-jsonschema` | Install go-jsonschema |

