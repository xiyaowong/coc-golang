# Lessons

Mistakes made in past sessions on this repo, kept short so they get read. Re-read before starting non-trivial work.

## Start simple

- Prefer the smallest design that satisfies the request. A picker backed by an in-memory list is often enough; do not add persistence, pruning, or archival until asked. When a plan grows beyond the issue, stop and simplify.

## coc.nvim

- `node_modules/coc.nvim/index.d.ts` answers API questions. Do not read coc.nvim's source on GitHub or elsewhere.
- Do not use `Document.dirty`; read the buffer's `modified` option instead.

## Verifying

- Never write tests, even throwaway probes, without asking first.
- Finish with `npm run build` so `lib/` matches the source.

## Docs

- Describe what a feature is and what it produces, not how it is operated. Prompt order, picker entries, hover text, and which keys a component binds are things the user experiences by running the command.
- Never edit `docs/content/docs/reference/` by hand — it is generated. `docs/content/docs/meta.json`'s `pages` array is written by the generator too.
