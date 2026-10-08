# Project preferences

- Do not add backward-compatibility code paths, fallbacks, version gates, or compatibility-specific documentation unless explicitly requested. Prefer implementing the current intended behavior directly.
- Do not use `Document.dirty` to tell whether a buffer has unsaved changes; it is unreliable. Read the buffer's `modified` option instead (`doc.buffer.getOption('modified')`).
- Run `npm run typecheck`, `npm run lint`, and `npm test` after every change and keep all three green.
- `npm test` runs `test:pure` and then `test:integration`. Integration tests (`test/integration/`) run the real extension through `coc-test` in a real nvim with real coc.nvim and real Go (via `test/integration.ts`, which isolates nvim config with `XDG_*`). They invoke `go.*` commands and assert user-visible results (output, diagnostics, files); do not mock `coc.nvim` or assert argv. Every `go.*` command should have at least one integration test where practical.
- Commit messages and PR titles must follow Conventional Commits (`feat:`, `fix:`, `perf:`, `docs:`, `refactor:`, `test:`, `chore:`, `ci:`; breaking changes use `!` or a `BREAKING CHANGE:` footer). release-please derives the version bump and CHANGELOG from them on `main`; do not bump versions or edit `CHANGELOG.md` by hand.
- Files under `test/pure/` must also pass under a bare `node --test` with no hooks; they may only import modules that do not depend on `coc.nvim`.
