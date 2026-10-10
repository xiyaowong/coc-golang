---
title: Converters
description: Generate Go types from a JSON Schema or from JSON.
---

Two commands generate Go types for you.

## From a JSON Schema

`go.convert.jsonSchema` runs `go-jsonschema` on the JSON Schema you have open,
or on one you pick from the workspace. It prompts for the package name and the
output file, then writes the generated Go and opens it.

```vim
:CocCommand go.convert.jsonSchema
```

Schemas that use the `date` or `date-time` formats make the generated code
import `github.com/atombender/go-jsonschema/pkg/types`.

This command needs the `go-jsonschema` tool:

```vim
:CocCommand go.tools.install.go-jsonschema
```

## From JSON

`go.convert.jsonToGo` opens a scratch JSON buffer and a scratch Go buffer side
by side, and regenerates the Go types as you type.

```vim
:CocCommand go.convert.jsonToGo
```

Choose where the JSON starts from:

- **From clipboard** — the system clipboard contents.
- **From a JSON file** — a `.json` file picked from the workspace, or a path
  you type.
- **From scratch** — an empty buffer.

Parse errors appear in the output buffer. Closing either window ends the
session.

The output matches the defaults of
[`mholt/json-to-go`](https://github.com/mholt/json-to-go) and needs no extra
tool.
