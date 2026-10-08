import { spawnSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// Isolate nvim from the user's own config so that only coc.nvim and this extension are loaded.
const xdg = join(tmpdir(), 'coc-golang-xdg')
mkdirSync(xdg, { recursive: true })

const result = spawnSync('npx', ['coc-test', '--nvim', ...(process.argv.slice(2).length ? process.argv.slice(2) : ['test/integration/**/*.test.ts'])], {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, XDG_CONFIG_HOME: xdg, XDG_DATA_HOME: xdg, XDG_STATE_HOME: xdg },
})
process.exit(result.status ?? 1)
