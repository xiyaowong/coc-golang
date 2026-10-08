import { spawnSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const testDirectory = dirname(fileURLToPath(import.meta.url))

const files = readdirSync(testDirectory, { recursive: true, encoding: 'utf8' })
  .map(entry => join(testDirectory, entry))
  .filter(file => file.endsWith('.test.ts'))
  .sort()

if (!files.length) {
  console.error(`No test files found under ${testDirectory}.`)
  process.exit(1)
}

const result = spawnSync(process.execPath, [
  '--import',
  pathToFileURL(join(testDirectory, 'hooks.ts')).href,
  '--test',
  ...files,
], { stdio: 'inherit' })

process.exit(result.status ?? 1)
