# coc-golang docs

The documentation website for `coc-golang`, built with
[Fumadocs](https://fumadocs.dev) (Next.js, static export). It is published to
GitHub Pages at https://xiyaowong.github.io/coc-golang/.

This app is self-contained and is not part of the published npm package.

## Content

Documentation pages live in `content/docs/` and are plain Markdown, so they
render on GitHub as well as on the site.

- `index.md`, `getting-started.md`, `keybindings.md`, `troubleshooting.md` are
  hand-written.
- `reference/` is **generated** from the extension's `package.json` (commands
  and settings) and `src/tools.ts` (tools).
- `changelog.md` is **generated** from the repository's `CHANGELOG.md`, and
  `meta.json` is generated alongside it. Both are git-ignored: the copy only
  needs to exist while the site is built or served.

Do not edit the generated files by hand — see below.

## Develop

```bash
npm install
npm run generate   # regenerate content/docs/reference from the repo
npm run dev        # http://localhost:3000
```

## Build

```bash
npm run generate   # required: fetches the changelog copy before building
npm run build      # static export to out/
npm start          # preview the export at http://localhost:3000
```

The build above serves at the root, which is what you want locally. The deploy
build sets a sub-path instead (CI does this for the GitHub Pages project site):

```bash
NEXT_PUBLIC_BASE_PATH=/coc-golang npm run build
```

Because the sub-path build rewrites every asset and link to `/coc-golang`, it
is only meaningful once deployed under that path; preview it locally by serving
the parent of an `out/` directory renamed to `coc-golang`, or just rely on the
root build for local checks.

## Regenerating the generated pages

`scripts/generate.ts` reads `../package.json` and `../src/tools.ts` and writes
`content/docs/reference/*.md` (plus `reference/meta.json`). It also turns the
repository's `../CHANGELOG.md` into `content/docs/changelog.md`. It has no
dependencies and runs on Node 22+ directly.

```bash
npm run generate          # write the files
npm run check:generate    # verify they are up to date (used by CI)
```

Run `npm run generate` and commit the result whenever commands, settings, or
tools change; `docs/content/docs/changelog.md` is not committed, so the
`changelog` entry in `content/docs/meta.json` is regenerated on every run and
is the only part of a changelog update that lands in git. CI (`docs-drift` in
`.github/workflows/ci.yml`) fails if the generated pages are stale.
