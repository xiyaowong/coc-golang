import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { delimiter, join } from 'node:path'
import { beforeEach, describe, it } from 'node:test'
import { pathToFileURL } from 'node:url'
import { findExecutable, goEnvironment, resolveExecutable, toolsDirectories } from '../../src/environment.ts'
import { pathKey } from '../../src/go-config-utils.ts'
import { configure, resetCoc, workspace } from '../fakes/coc-nvim.ts'

beforeEach(() => {
  resetCoc()
})

describe('goEnvironment', () => {
  it('sets GOROOT and prepends its bin directory to PATH', () => {
    configure({ goroot: '/usr/local/go' })
    const environment = goEnvironment()
    assert.equal(environment.GOROOT, '/usr/local/go')
    assert.ok(environment[pathKey(environment)]?.startsWith(`${join('/usr/local/go', 'bin')}${delimiter}`))
  })

  it('sets GOPATH from the setting', () => {
    configure({ gopath: '/home/u/go' })
    assert.equal(goEnvironment().GOPATH, '/home/u/go')
  })

  it('replaces GOPATH with toolsGopath for tool installs', () => {
    configure({ gopath: '/home/u/go', toolsGopath: '/tools' })
    assert.equal(goEnvironment({ forToolInstall: true }).GOPATH, '/tools')
  })

  it('overrides the process environment with toolsEnvVars', () => {
    configure({ toolsEnvVars: { COC_GOLANG_TEST: 'from-config' } })
    assert.equal(goEnvironment().COC_GOLANG_TEST, 'from-config')
  })

  it('infers GOPATH from the workspace folder outside a module', () => {
    const root = mkdtempSync(join(tmpdir(), 'coc-golang-env-'))
    const folder = join(root, 'go', 'src', 'example.com', 'x')
    mkdirSync(folder, { recursive: true })
    configure({ inferGopath: true })
    workspace.workspaceFolders = [{ uri: pathToFileURL(folder).href }]
    try {
      assert.equal(goEnvironment().GOPATH, join(root, 'go'))
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})

describe('toolsDirectories', () => {
  it('collects GOBIN, GOPATH/bin and the tools GOPATH', () => {
    configure({ toolsGopath: '/tools' })
    assert.deepEqual(
      toolsDirectories({ GOBIN: '/gobin', GOPATH: ['/go1', '/go2'].join(delimiter) }),
      [join('/tools', 'bin'), '/gobin', join('/go1', 'bin'), join('/go2', 'bin')],
    )
  })
})

describe('executable resolution', () => {
  it('resolves an absolute path', () => {
    assert.equal(resolveExecutable(process.execPath), process.execPath)
  })

  it('returns undefined for a path that does not exist', () => {
    assert.equal(resolveExecutable(join(tmpdir(), 'coc-golang-missing', 'tool')), undefined)
  })

  it('returns undefined for a command that is not on PATH', () => {
    assert.equal(resolveExecutable('coc-golang-no-such-command'), undefined)
  })

  it('finds nothing inside a directory that does not exist', () => {
    assert.equal(findExecutable([join(tmpdir(), 'coc-golang-missing')], 'go'), undefined)
  })
})
