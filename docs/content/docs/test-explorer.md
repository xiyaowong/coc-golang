---
title: Test explorer
description: Browse, run, and check the status of Go tests from a tree view.
---

`go.test.explorer.show` opens the **Go Tests** tree view — a browsable tree of
every test and benchmark in your workspace.

```vim
:CocCommand go.test.explorer.show
```

## What the tree shows

Tests are nested `folder → package → file → test → subtest`. Each node carries
the status of the tests beneath it:

- `✓` passed, `✗` failed, `●` running, `○` skipped.
- Parent nodes show a summary such as `3 passed · 1 failed`.
- Hover a test for its file and line, how long it took, and its captured output.

## Run and jump

Run any node — a test, file, package, or folder runs everything beneath it.
Run the node under the cursor with `<cr>`, or `go.test.explorer.runAll` to run
the whole workspace.

| Task | Command |
| --- | --- |
| Open the tree | `go.test.explorer.show` |
| Run the selected node | `go.test.explorer.run` |
| Jump to the selected node's file | `go.test.explorer.open` |
| Run everything | `go.test.explorer.runAll` |
| Re-scan the workspace | `go.test.explorer.refresh` |
| Pick a single test from a list | `go.test.explorer` |

The tree is a normal coc.nvim tree buffer, so its built-in keys work — `f`
filters the tree by name, and `<cr>` runs the selected item. See `:h coc-tree`
and `:h coc-tree-filter`.

## Keys

```vim
nnoremap <leader>gt :CocCommand go.test.explorer.show<CR>
nnoremap <leader>gr :CocCommand go.test.explorer.run<CR>
nnoremap <leader>go :CocCommand go.test.explorer.open<CR>
```

The tree refreshes itself when a `_test.go` file is saved.
