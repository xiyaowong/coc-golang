---
title: Keybindings and recipes
description: Map coc-golang commands to keys for the actions you use most.
---

coc-golang ships no default keymaps — commands are run with `:CocCommand`. Map
the ones you use often in your `init.vim` / `init.lua` (or `~/.vimrc`).

## Example mappings

The commands below are good candidates for a shortcut. Pick keys that are free
in your setup.

```vim
" Run the test under the cursor
nnoremap <leader>gt :CocCommand go.test.cursor<CR>

" Run the whole package
nnoremap <leader>gp :CocCommand go.test.package<CR>

" Repeat the previous test run
nnoremap <leader>gl :CocCommand go.test.previous<CR>

" Toggle between a file and its test
nnoremap <leader>ga :CocCommand go.toggle.test.file<CR>

" Format and organize imports
nnoremap <leader>gf :CocCommand go.fmt.package<CR>
nnoremap <leader>gi :CocCommand go.import.organize<CR>

" Build and vet the package
nnoremap <leader>gb :CocCommand go.build.package<CR>
nnoremap <leader>gv :CocCommand go.vet.package<CR>
```

The same in Lua:

```lua
vim.keymap.set('n', '<leader>gt', '<cmd>CocCommand go.test.cursor<cr>')
vim.keymap.set('n', '<leader>gp', '<cmd>CocCommand go.test.package<cr>')
vim.keymap.set('n', '<leader>gl', '<cmd>CocCommand go.test.previous<cr>')
```

## Run a struct-tag edit on a key

Struct-tag commands act on the struct or field under the cursor, or on a visual
selection — so they work well bound to a key:

```vim
" Add json tags to the struct or field under the cursor
nnoremap <leader>tj :CocCommand go.tags.add json<CR>

" Remove json tags
nnoremap <leader>tr :CocCommand go.tags.remove json<CR>
```

`go.tags.add` and `go.tags.remove` also accept tag options, for example
`json=omitempty`.

## Pick a test interactively

`go.test.explorer` lists the tests in the current package and runs the one you
choose:

```vim
nnoremap <leader>ge :CocCommand go.test.explorer<CR>
```

## Browse and run tests from a tree

`go.test.explorer.show` opens the **Go Tests** tree view, which nests folders,
packages, files, tests, and subtests. Run or locate the selected node with the
tree commands:

```vim
nnoremap <leader>gt :CocCommand go.test.explorer.show<CR>
nnoremap <leader>gr :CocCommand go.test.explorer.run<CR>
nnoremap <leader>go :CocCommand go.test.explorer.open<CR>
```

`go.test.explorer.run` runs the selected node — a single test, or everything in
the file, package, or folder it belongs to. `go.test.explorer.open` jumps to the
file and line a test is defined in (or the file itself for a file node).

The tree is a normal coc.nvim tree buffer, so its built-in keys work — in
particular `f` filters the tree by fuzzy-matching test names, and `<cr>` runs
the selected test. See `:h coc-tree` and `:h coc-tree-filter` for the full list.

## See the list of commands

`:CocList commands` shows every command coc.nvim knows about, including all
`go.*` commands. See the [command reference](./reference/commands) for
descriptions.
