---
title: Package search
description: Search pkg.go.dev for packages and act on the results.
---

`go.pkg.search` searches [pkg.go.dev](https://pkg.go.dev) for Go packages and
acts on what it finds, without leaving the editor. It searches as you type.

```vim
:CocCommand go.pkg.search
```

Each result shows the package path, its latest version, and its synopsis.

Each action runs a go command:

| Action | Command |
| --- | --- |
| `get` (default) | `go get <packagePath>` |
| `install` | `go install <packagePath>` |
| `download` | `go mod download <modulePath>` |

Several packages can be picked at once, and each one gets its own command.
