import type { Project } from './helpers'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { after, describe, it } from 'node:test'
import { DiagnosticSeverity, workspace } from 'coc.nvim'
import { createProject, currentDiagnostics, currentDiagnosticsCleared, outputMatching, run, waitFor } from './helpers'

const projects: Project[] = []
function project(files: Record<string, string>): Project {
  const created = createProject(files)
  projects.push(created)
  return created
}
after(() => projects.forEach(created => created.cleanup()))

const broken = 'package main\n\nfunc main() {\n\tvar unused int\n}\n'

describe('build and vet', () => {
  it('go.build.package reports compile errors as error diagnostics', async () => {
    const p = project({ 'main.go': broken })
    await p.open('main.go')
    await run('go.build.package')
    const found = await currentDiagnostics('go-build')
    assert.equal(found[0].severity, DiagnosticSeverity.Error)
    assert.match(found[0].message, /declared and not used/)
    assert.equal(found[0].range.start.line, 3)
  })

  it('go.build.package clears diagnostics once the code is fixed', async () => {
    const p = project({ 'main.go': broken })
    await p.open('main.go')
    await run('go.build.package')
    await currentDiagnostics('go-build')
    await workspace.nvim.call('setline', [4, '\t_ = 1'])
    await workspace.nvim.command('write')
    await run('go.build.package')
    const remaining = await currentDiagnosticsCleared('go-build')
    assert.equal(remaining.length, 0)
  })

  it('go.build.workspace reports compile errors', async () => {
    const p = project({ 'main.go': broken })
    await workspace.nvim.command(`cd ${p.root}`)
    await p.open('main.go')
    await run('go.build.workspace')
    const found = await currentDiagnostics('go-build')
    assert.match(found[0].message, /declared and not used/)
  })

  it('go.vet.package reports vet findings as warnings', async () => {
    const p = project({ 'main.go': 'package main\n\nimport "fmt"\n\nfunc main() {\n\tfmt.Printf("%d\\n", "text")\n}\n' })
    await p.open('main.go')
    await run('go.vet.package')
    const found = await currentDiagnostics('go-vet')
    assert.equal(found[0].severity, DiagnosticSeverity.Warning)
    assert.match(found[0].message, /Printf/)
  })

  it('go.vet.workspace reports vet findings', async () => {
    const p = project({ 'main.go': 'package main\n\nimport "fmt"\n\nfunc main() {\n\tfmt.Printf("%d\\n", "text")\n}\n' })
    await workspace.nvim.command(`cd ${p.root}`)
    await p.open('main.go')
    await run('go.vet.workspace')
    assert.ok((await currentDiagnostics('go-vet')).length > 0)
  })
})

describe('run and module commands', () => {
  it('go.run runs the current package', async () => {
    const p = project({ 'main.go': 'package main\n\nfunc main() { println("run-marker") }\n' })
    await p.open('main.go')
    await run('go.run')
    await outputMatching(/run-marker/)
  })

  it('go.fmt.package formats the files on disk', async () => {
    const p = project({ 'main.go': 'package main\n\nfunc   main(){\n}\n' })
    await p.open('main.go')
    await run('go.fmt.package')
    await waitFor(async () => readFileSync(p.path('main.go'), 'utf8'), text => text.includes('func main() {'))
    assert.match(readFileSync(p.path('main.go'), 'utf8'), /func main\(\) \{/)
  })

  it('go.mod.init creates go.mod', async () => {
    const p = project({ 'main.go': 'package main\n\nfunc main() {}\n' })
    rmSync(p.path('go.mod'))
    await p.open('main.go')
    await run('go.mod.init', 'example.com/initialized')
    await waitFor(async () => existsSync(p.path('go.mod')), Boolean)
    assert.match(readFileSync(p.path('go.mod'), 'utf8'), /module example\.com\/initialized/)
  })

  it('go.mod.tidy and go.mod.vendor run in the module', async () => {
    const p = project({ 'main.go': 'package main\n\nfunc main() {}\n' })
    await p.open('main.go')
    await run('go.mod.tidy')
    await run('go.mod.vendor')
    await waitFor(async () => existsSync(p.path('vendor')), Boolean)
  })

  it('go.generate.package runs go:generate directives', async () => {
    const p = project({ 'main.go': '//go:generate go version\npackage main\n\nfunc main() {}\n' })
    await p.open('main.go')
    await run('go.generate.package')
    await outputMatching(/go version go/)
  })
})

describe('environment commands', () => {
  it('go.env shows the Go environment', async () => {
    await run('go.env')
    await outputMatching(/GOROOT=/)
  })

  it('go.version shows the Go version', async () => {
    await run('go.version')
    await outputMatching(/go version go\d/)
  })

  it('go.locate.tools lists the tools', async () => {
    await run('go.locate.tools')
    await outputMatching(/gopls:/)
  })

  it('go.gopath and go.goroot query the Go environment', async () => {
    await run('go.gopath')
    await run('go.goroot')
    await outputMatching(/go env GOPATH[\s\S]*go env GOROOT/)
  })
})

describe('go.alternateTools', () => {
  it('a missing go binary does not crash commands', async () => {
    const config = workspace.getConfiguration('go')
    await config.update('alternateTools', { go: join('nonexistent', 'go') }, true)
    try {
      const p = project({ 'main.go': 'package main\n\nfunc main() {}\n' })
      await p.open('main.go')
      await run('go.build.package')
      await run('go.test.package')
    } finally {
      await config.update('alternateTools', undefined, true)
    }
  })
})
