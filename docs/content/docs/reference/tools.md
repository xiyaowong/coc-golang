---
title: Go tools
description: The Go tools coc-golang can install for you.
---

<!-- Generated from package.json (and src/tools.ts). Do not edit by hand. -->
coc-golang installs 14 Go tools with `go install`. Install one with its command, or run `:CocCommand go.tools.install` to pick from a list.

| Tool | Module | Install command | Optional |
| --- | --- | --- | --- |
| `gopls` | `golang.org/x/tools/gopls` | `go.tools.install.gopls` | no |
| `dlv` | `github.com/go-delve/delve/cmd/dlv` | `go.tools.install.dlv` | no |
| `goimports` | `golang.org/x/tools/cmd/goimports` | `go.tools.install.goimports` | no |
| `staticcheck` | `honnef.co/go/tools/cmd/staticcheck` | `go.tools.install.staticcheck` | no |
| `gomodifytags` | `github.com/fatih/gomodifytags` | `go.tools.install.gomodifytags` | no |
| `gotests` | `github.com/cweill/gotests/gotests` | `go.tools.install.gotests` | no |
| `impl` | `github.com/josharian/impl` | `go.tools.install.impl` | no |
| `golint` | `golang.org/x/lint/golint` | `go.tools.install.golint` | yes |
| `golangci-lint` | `github.com/golangci/golangci-lint/cmd/golangci-lint` | `go.tools.install.golangci-lint` | yes |
| `golangci-lint-v2` | `github.com/golangci/golangci-lint/v2/cmd/golangci-lint` | `go.tools.install.golangci-lint-v2` | yes |
| `revive` | `github.com/mgechev/revive` | `go.tools.install.revive` | yes |
| `gofumpt` | `mvdan.cc/gofumpt` | `go.tools.install.gofumpt` | yes |
| `goformat` | `winterdrache.de/goformat/goformat` | `go.tools.install.goformat` | yes |
| `go-jsonschema` | `github.com/atombender/go-jsonschema` | `go.tools.install.go-jsonschema` | yes |

Optional tools are only needed for their specific feature; run `:CocCommand go.locate.tools` to see what is already installed.
