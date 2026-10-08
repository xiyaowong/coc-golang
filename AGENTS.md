# Project preferences

- Do not add backward-compatibility code paths, fallbacks, version gates, or compatibility-specific documentation unless explicitly requested. Prefer implementing the current intended behavior directly.
- Run `npm run typecheck`, `npm run lint`, and `npm test` after every change and keep all three green.
- `npm test` runs `test:pure` and then `test:integration`. Integration tests (`test/integration/`) run the real extension through `coc-test` in a real nvim with real coc.nvim and real Go (via `test/integration.ts`, which isolates nvim config with `XDG_*`). They invoke `go.*` commands and assert user-visible results (output, diagnostics, files); do not mock `coc.nvim` or assert argv. Every `go.*` command should have at least one integration test where practical.
- Files under `test/pure/` must also pass under a bare `node --test` with no hooks; they may only import modules that do not depend on `coc.nvim`.
