import assert from 'node:assert/strict'
import { beforeEach, describe, it } from 'node:test'
import { getPreviousTest, runTests } from '../../src/test.ts'
import { resetChildProcess, spawnCalls } from '../fakes/child-process.ts'
import { configure, resetCoc } from '../fakes/coc-nvim.ts'

const cwd = '/workspace'

beforeEach(() => {
  resetCoc()
  resetChildProcess()
})

describe('runTests', () => {
  it('runs go test with the requested selection', async () => {
    await runTests(['-run', '^TestFoo$'], cwd)
    const call = spawnCalls.at(-1)
    assert.ok(call)
    assert.equal(call.command, 'go')
    assert.deepEqual(call.args, ['test', '-run', '^TestFoo$'])
    assert.equal(call.options.cwd, cwd)
  })

  it('prepends the configured test flags', async () => {
    configure({ testFlags: ['-race'], testTimeout: '30s' })
    await runTests(['-run', '^TestFoo$'], cwd)
    assert.deepEqual(spawnCalls.at(-1)?.args, ['test', '-race', '-timeout', '30s', '-run', '^TestFoo$'])
  })

  it('passes the test environment to the process', async () => {
    configure({ testEnvVars: { FROM_SETTING: '1' } })
    await runTests(['-run', '^TestFoo$'], cwd)
    assert.equal(spawnCalls.at(-1)?.options.env?.FROM_SETTING, '1')
  })

  it('remembers the last selection', async () => {
    await runTests(['-run', '^TestFoo$'], cwd)
    assert.deepEqual(getPreviousTest(), { args: ['-run', '^TestFoo$'], cwd })

    await runTests(['-run', '^TestBar$'], '/other')
    assert.deepEqual(getPreviousTest(), { args: ['-run', '^TestBar$'], cwd: '/other' })
  })
})
