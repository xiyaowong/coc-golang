# Lessons

Mistakes made in past sessions on this repo, kept short so they get read. Re-read before starting non-trivial work.

## Start simple

- Prefer the smallest design that satisfies the request. A picker backed by an in-memory list is often enough; do not add persistence, pruning, or archival until asked. When a plan grows beyond the issue, stop and simplify.

## coc.nvim

- `node_modules/coc.nvim/index.d.ts` answers API questions. Do not read coc.nvim's source on GitHub or elsewhere.
- Do not use `Document.dirty`; read the buffer's `modified` option instead.

## Verifying

- Never write tests, even throwaway probes, without asking first.
- Probing the tool is not verifying the feature. When a command pipes a tool's output into the editor, check where that output lands in a real buffer: the tool can be right while the edit still corrupts text around it. If the editor half cannot be checked, say so in the PR rather than implying the whole path was verified.
- Finish with `npm run build` so `lib/` matches the source.
- Run integration tests through `node test/integration.ts` (or `npm test`), never `npx coc-test` directly: the script sets the `XDG_*` isolation the child needs, and without it nvim fails to initialize with a `coc#util#vim_info` timeout that looks like a real failure but is not.
- Scope temporary env vars (e.g. `GOTOOLCHAIN`) to the command that needs them. Setting one for a whole shell can break an unrelated tool, and the resulting empty output reads as "the tool found nothing".
- `npm run lint:fix` runs the `e18e/prefer-array-fill` autofix, which rewrites `Array.from({ length: n }, () => x)` into `Array.from({ length: n }).fill(x)` — a form `tsc` rejects with `unknown[]`. Writing the callback form leaves a diff that fails CI's `npm run lint`, and running the autofix leaves one that fails typecheck. Use an explicit loop with a typed array instead. Mirrored on an earlier commit: HEAD held the autofixed `.fill` line while the working tree held the fix, because the two were written into the same file between commands. Verify the committed blob (`git show HEAD:<file>`) and keep the worktree clean before pushing.

## Git

- Check a PR's state before amending its commit. Squash-merging rewrites the message and closes the PR; a later force-push only creates an orphaned branch and silently changes nothing on `main`.

## Docs

- Describe what a feature is and what it produces, not how it is operated. Prompt order, picker entries, hover text, and which keys a component binds are things the user experiences by running the command.
- Never edit `docs/content/docs/reference/` by hand — it is generated. `docs/content/docs/meta.json`'s `pages` array is written by the generator too.
