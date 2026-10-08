import type { Project } from './helpers'
import assert from 'node:assert/strict'
import { after, describe, it } from 'node:test'
import { workspace } from 'coc.nvim'
import { createProject, goOutput, outputMatching, run, waitFor } from './helpers'

// Every test fails with a unique marker, so the shared output channel shows exactly which tests ran.
const fixture = (id: string): string => `package fixture

import "testing"

func TestAlpha(t *testing.T) { t.Fatal("${id}-alpha") }

func TestBeta(t *testing.T) {
\tt.Run("inner", func(t *testing.T) { t.Fatal("${id}-inner") })
\tt.Fatal("${id}-beta")
}

func BenchmarkSpeed(b *testing.B) {
\tb.Log("${id}-bench")
}
`

const projects: Project[] = []
function project(id: string, files: Record<string, string> = {}): Project {
  const created = createProject({ 'a_test.go': fixture(id), ...files })
  projects.push(created)
  return created
}
after(() => projects.forEach(created => created.cleanup()))

describe('go test commands', () => {
  it('go.test.package runs every test in the package', async () => {
    const p = project('pkg')
    await p.open('a_test.go')
    await run('go.test.package')
    const output = await outputMatching(/pkg-alpha[\s\S]*pkg-beta|pkg-beta[\s\S]*pkg-alpha/)
    assert.match(output, /FAIL\s+example\.com\/fixture/)
  })

  it('go.test.cursor runs only the test under the cursor', async () => {
    const p = project('cur')
    await p.open('a_test.go', 5)
    await run('go.test.cursor')
    const output = await outputMatching(/cur-alpha/)
    assert.doesNotMatch(output, /cur-beta/)
  })

  it('go.test.file runs all tests in the current file', async () => {
    const p = project('file')
    await p.open('a_test.go')
    await run('go.test.file')
    const output = await outputMatching(/file-alpha[\s\S]*file-beta|file-beta[\s\S]*file-alpha/)
    assert.ok(output)
  })

  it('go.subtest.cursor runs only the subtest under the cursor', async () => {
    const p = project('sub')
    await p.open('a_test.go', 8)
    await workspaceCursorOnWord('inner')
    await run('go.subtest.cursor')
    const output = await outputMatching(/sub-inner/)
    assert.doesNotMatch(output, /sub-alpha/)
  })

  it('go.test.cursorOrPrevious falls back to the previous run outside a test', async () => {
    const p = project('prev')
    await p.open('a_test.go', 5)
    await run('go.test.cursor')
    await outputMatching(/prev-alpha/)
    await p.open('a_test.go', 3)
    await run('go.test.cursorOrPrevious')
    const output = await waitFor(goOutput, text => (text.match(/prev-alpha/g) ?? []).length >= 2)
    assert.equal((output.match(/prev-alpha/g) ?? []).length, 2)
  })

  it('go.test.previous repeats the last run', async () => {
    const p = project('again')
    await p.open('a_test.go', 5)
    await run('go.test.cursor')
    await outputMatching(/again-alpha/)
    await run('go.test.previous')
    const output = await waitFor(goOutput, text => (text.match(/again-alpha/g) ?? []).length >= 2)
    assert.equal((output.match(/again-alpha/g) ?? []).length, 2)
  })

  it('go.test.coverage reports coverage', async () => {
    const p = project('cover', { 'lib.go': 'package fixture\n\nfunc Used() int { return 1 }\n' })
    await p.open('a_test.go')
    await run('go.test.coverage')
    await outputMatching(/cover-alpha/)
    await outputMatching(/coverage:/)
  })

  it('go.test.workspace runs tests across the workspace', async () => {
    const p = project('ws')
    await p.open('a_test.go')
    await workspace.nvim.command(`cd ${p.root}`)
    await run('go.test.workspace')
    await outputMatching(/ws-alpha/)
  })

  it('go.benchmark.package runs benchmarks', async () => {
    const p = project('bpkg')
    await p.open('a_test.go')
    await run('go.benchmark.package')
    await outputMatching(/bpkg-bench/)
  })

  it('go.benchmark.cursor runs the benchmark under the cursor', async () => {
    const p = project('bcur')
    await p.open('a_test.go', 12)
    await run('go.benchmark.cursor')
    await outputMatching(/bcur-bench/)
  })

  it('go.benchmark.file runs benchmarks of the current file', async () => {
    const p = project('bfile')
    await p.open('a_test.go')
    await run('go.benchmark.file')
    await outputMatching(/bfile-bench/)
  })

  it('go.test.showOutput and go.test.cancel run without error', async () => {
    await run('go.test.showOutput')
    await run('go.test.cancel')
  })
})

async function workspaceCursorOnWord(word: string): Promise<void> {
  const line = await workspace.nvim.call('search', [word, 'cw']) as number
  assert.ok(line > 0, `\"${word}\" not found in buffer`)
}
