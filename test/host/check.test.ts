import assert from 'node:assert/strict'
import { devNull, tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { beforeEach, describe, it } from 'node:test'
import { pathToFileURL } from 'node:url'
import { runCheck } from '../../src/check.ts'
import { resetChildProcess, respondWith, spawnCalls } from '../fakes/child-process.ts'
import { configure, diagnostics, messages, resetCoc } from '../fakes/coc-nvim.ts'

const cwd = '/workspace'

function expectCommand(command: string, args: string[]): void {
  const call = spawnCalls.at(-1)
  assert.ok(call, 'expected a spawned process')
  assert.equal(call.command, command)
  assert.deepEqual(call.args, args)
  assert.equal(call.options.cwd, cwd)
}

beforeEach(() => {
  resetCoc()
  resetChildProcess()
})

describe('runCheck build', () => {
  it('builds the package into the null device', async () => {
    await runCheck('build', 'package', { cwd })
    expectCommand('go', ['build', '-o', devNull, '.'])
  })

  it('builds the whole workspace without redirecting the output', async () => {
    await runCheck('build', 'workspace', { cwd })
    expectCommand('go', ['build', './...'])
  })

  it('builds a single file', async () => {
    await runCheck('build', 'file', { cwd, file: '/workspace/main.go' })
    expectCommand('go', ['build', '-o', devNull, '/workspace/main.go'])
  })

  it('passes the build flags and tags through', async () => {
    configure({ buildFlags: ['-v'], buildTags: 'tag' })
    await runCheck('build', 'package', { cwd })
    expectCommand('go', ['build', '-v', '-tags', 'tag', '-o', devNull, '.'])
  })

  it('installs dependencies when the setting is on', async () => {
    configure({ installDependenciesWhenBuilding: true })
    await runCheck('build', 'package', { cwd })
    expectCommand('go', ['build', '-i', '-o', devNull, '.'])
  })
})

describe('runCheck vet', () => {
  it('vets the package', async () => {
    await runCheck('vet', 'package', { cwd })
    expectCommand('go', ['vet', '.'])
  })

  it('combines the build flags with the vet flags', async () => {
    configure({ buildTags: 'tag', vetFlags: ['-unreachable'] })
    await runCheck('vet', 'workspace', { cwd })
    expectCommand('go', ['vet', '-tags', 'tag', '-unreachable', './...'])
  })
})

describe('runCheck lint', () => {
  it('runs the configured lint tool through its subcommand', async () => {
    configure({ lintTool: 'golangci-lint', alternateTools: { 'golangci-lint': process.execPath } })
    await runCheck('lint', 'package', { cwd })
    expectCommand(process.execPath, ['run', '.'])
  })

  it('warns when the lint tool cannot be resolved', async () => {
    configure({
      lintTool: 'staticcheck',
      alternateTools: { staticcheck: join(tmpdir(), 'coc-golang-missing', 'staticcheck') },
    })
    await runCheck('lint', 'package', { cwd })
    assert.equal(spawnCalls.length, 0)
    assert.match(messages[0], /is not installed/)
  })
})

describe('diagnostics', () => {
  it('publishes parsed problems from the tool output', async () => {
    respondWith({ code: 1, stdout: 'main.go:3:5: undefined: x' })
    await runCheck('build', 'package', { cwd })

    const entries = diagnostics.get('go-build')
    assert.ok(entries)
    assert.equal(entries.length, 1)
    assert.equal(entries[0][0], pathToFileURL(resolve(cwd, 'main.go')).href)
    assert.deepEqual(entries[0][1], [{
      range: { start: { line: 2, character: 4 }, end: { line: 2, character: 4 } },
      message: 'undefined: x',
      severity: 1,
    }])
  })

  it('reports vet problems as warnings', async () => {
    respondWith({ code: 1, stdout: 'vet: main.go:1:1: unreachable code' })
    await runCheck('vet', 'package', { cwd })

    const entries = diagnostics.get('go-vet')
    assert.ok(entries)
    assert.deepEqual(entries[0][1], [{
      range: { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } },
      message: 'unreachable code',
      severity: 2,
    }])
  })
})
