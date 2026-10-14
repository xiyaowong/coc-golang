---
title: Keybindings and recipes
description: Map coc-golang commands to keys for the actions you use most.
---

coc-golang ships no default keymaps — commands are run with `:CocCommand`. Map
the ones you use often in your `init.vim` / `init.lua` (or `~/.vimrc`).

## 1. Pick a key

Pick keys that are free in your setup. These are good candidates:

```vim
nnoremap <leader>gt :CocCommand go.test.cursor<CR>
nnoremap <leader>gp :CocCommand go.test.package<CR>
nnoremap <leader>ga :CocCommand go.toggle.test.file<CR>
nnoremap <leader>gf :CocCommand go.fmt.package<CR>
nnoremap <leader>gi :CocCommand go.import.organize<CR>
nnoremap <leader>gb :CocCommand go.build.package<CR>
nnoremap <leader>gv :CocCommand go.vet.package<CR>
```

The same in Lua:

```lua
vim.keymap.set('n', '<leader>gt', '<cmd>CocCommand go.test.cursor<cr>')
vim.keymap.set('n', '<leader>gp', '<cmd>CocCommand go.test.package<cr>')
vim.keymap.set('n', '<leader>ga', '<cmd>CocCommand go.toggle.test.file<cr>')
```

## 2. Add a recipe

A few commands need the cursor or a selection in the right place. Map those to
keys too, and they keep working: `go.tags.add` and `go.tags.remove` act on the
struct or field under the cursor, or on a visual selection.

```vim
nnoremap <leader>tj :CocCommand go.tags.add json<CR>
nnoremap <leader>tr :CocCommand go.tags.remove json<CR>
```

Both accept tag options, for example `json=omitempty`.

The test explorer and the converters are mapped the same way:

```vim
nnoremap <leader>ge :CocCommand go.test.explorer.show<CR>
nnoremap <leader>gr :CocCommand go.test.explorer.run<CR>
nnoremap <leader>gj :CocCommand go.convert.jsonToGo<CR>
```

## 3. Repeat the last run

`go.test.previous` reruns whatever tests you ran last, whichever command started
them — so it deserves a key of its own:

```vim
nnoremap <leader>gl :CocCommand go.test.previous<CR>
```

## See the list of commands

`:CocList commands` shows every command coc.nvim knows about, including all
`go.*` commands. See the [command reference](./reference/commands) for
descriptions, [Test explorer](./test-explorer) and [Converters](./convert) for
what those commands do.
