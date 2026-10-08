import type { Project } from './helpers'
import assert from 'node:assert/strict'
import { after, describe, it } from 'node:test'
import { workspace } from 'coc.nvim'
import { createProject, currentDiagnostics, run, terminalMatching, waitFor } from './helpers'

const projects: Project[] = []
function project(files: Record<string, string>): Project {
  const created = createProject(files)
  projects.push(created)
  return created
}
after(() => projects.forEach(created => created.cleanup()))

const currentFile = async (): Promise<string> => workspace.nvim.call('expand', ['%:t']) as Promise<string>

describe('go.toggle.test.file', () => {
  it('switches between a source file and its test file', async () => {
    const p = project({
      'lib.go': 'package fixture\n',
      'lib_test.go': 'package fixture\n',
    })
    await p.open('lib.go')
    await run('go.toggle.test.file')
    assert.equal(await waitFor(currentFile, name => name === 'lib_test.go'), 'lib_test.go')
    await run('go.toggle.test.file')
    assert.equal(await waitFor(currentFile, name => name === 'lib.go'), 'lib.go')
  })
})

describe('save handler', () => {
  it('builds and vets the package when a Go file is saved', async () => {
    const p = project({ 'main.go': 'package main\n\nfunc main() {\n\tvar unused int\n}\n' })
    await p.open('main.go')
    await workspace.nvim.command('write!')
    const found = await currentDiagnostics('go-build')
    assert.match(found[0].message, /declared and not used/)
  })

  it('runs the package tests on save when testOnSave is enabled', async () => {
    const config = workspace.getConfiguration('go')
    await config.update('testOnSave', true, true)
    try {
      const p = project({
        'lib.go': 'package fixture\n',
        'lib_test.go': 'package fixture\n\nimport "testing"\n\nfunc TestSaved(t *testing.T) { t.Fatal("onsave-marker") }\n',
      })
      await p.open('lib.go')
      await workspace.nvim.command('write!')
      await terminalMatching(/onsave-marker/)
    } finally {
      await config.update('testOnSave', undefined, true)
    }
  })
})
