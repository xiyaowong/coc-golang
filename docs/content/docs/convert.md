---
title: Converters
description: Generate Go types from a JSON Schema or from JSON.
---

Two commands generate Go types for you.

## From a JSON Schema

`go.convert.jsonSchema` runs `go-jsonschema` on the JSON Schema you have open
and opens the generated Go.

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

The JSON can start from the clipboard, from a file, or from an empty buffer.

The output matches the defaults of
[`mholt/json-to-go`](https://github.com/mholt/json-to-go) and needs no extra
tool.
