import type { Project } from './helpers'
import assert from 'node:assert/strict'
import { after, describe, it } from 'node:test'
import * as coc from 'coc.nvim'
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

describe('go.tags commands', () => {
  it('adds tags to struct via go.tags.add', async () => {
    const p = project({
      'tags.go': 'package fixture\n\ntype User struct {\n\tName string\n}\n',
    })
    await p.open('tags.go', 3)
    const commandsList = await workspace.nvim.call('CocAction', ['commands'])
    console.log('COMMANDS:', commandsList)
    try {
      await run('go.tags.add', 'json,json=omitempty')
    } catch (e) {
      console.log('RUN ERROR:', e)
    }
    const doc = await workspace.document
    await waitFor(() => Promise.resolve(doc.content), content => content.includes('`json:"name,omitempty"`'))
    assert.match(doc.content, /Name\s+string\s+`json:"name,omitempty"`/)
  })

  it('clears tags and options via go.tags.clear', async () => {
    const p = project({
      'tags.go': 'package fixture\n\ntype User struct {\n\tName string `json:"name,omitempty"`\n}\n',
    })
    await p.open('tags.go', 3)
    await run('go.tags.clear')
    const doc = await workspace.document
    await waitFor(() => Promise.resolve(doc.content), content => !content.includes('`json:'))
    assert.doesNotMatch(doc.content, /`json:/)
  })

  it('works with dirty buffer without saving to disk first', async () => {
    const p = project({
      'tags.go': 'package fixture\n',
    })
    await p.open('tags.go', 1)
    const doc = await workspace.document
    await doc.applyEdits([coc.TextEdit.insert(coc.Position.create(1, 0), '\ntype Item struct {\n\tID int\n}\n')])
    await coc.wait(200)
    await workspace.nvim.call('cursor', [3, 1])
    await run('go.tags.add', 'json')
    await waitFor(() => Promise.resolve(doc.content), content => content.includes('`json:"id"`'))
    assert.match(doc.content, /ID\s+int\s+`json:"id"`/)
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
