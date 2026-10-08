# Project preferences

- Do not add backward-compatibility code paths, fallbacks, version gates, or compatibility-specific documentation unless explicitly requested. Prefer implementing the current intended behavior directly.
- Run `npm run typecheck`, `npm run lint`, and `npm test` after every change and keep all three green.
- `npm test` goes through `test/run.ts`, which starts Node with `test/hooks.ts` (`--import`) so that `coc.nvim` and `node:child_process` resolve to the fakes in `test/fakes/`. Assertions cover the argv, cwd and env of the commands the extension would run.
- Files under `test/pure/` must also pass under a bare `node --test` with no hooks; they may only import modules that do not depend on `coc.nvim`.
