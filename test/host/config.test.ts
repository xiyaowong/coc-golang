import assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, beforeEach, describe, it } from 'node:test'
import {
  alternateTool,
  configValue,
  goBuildFlags,
  goCommand,
  goTestEnvironment,
  goTestFlags,
} from '../../src/config.ts'
import { configure, messages, resetCoc } from '../fakes/coc-nvim.ts'

const directory = mkdtempSync(join(tmpdir(), 'coc-golang-config-'))

after(() => {
  rmSync(directory, { recursive: true, force: true })
})

beforeEach(() => {
  resetCoc()
})

describe('configValue', () => {
  it('falls back when the setting is absent', () => {
    assert.deepEqual(configValue('buildFlags', ['-fallback']), ['-fallback'])
  })

  it('returns the configured value', () => {
    configure({ buildFlags: ['-v'] })
    assert.deepEqual(configValue('buildFlags', []), ['-v'])
  })
})

describe('alternateTool', () => {
  it('trims the configured path', () => {
    configure({ alternateTools: { go: '  /usr/local/go/bin/go  ' } })
    assert.equal(alternateTool('go'), '/usr/local/go/bin/go')
  })

  it('ignores a blank entry', () => {
    configure({ alternateTools: { go: '   ' } })
    assert.equal(alternateTool('go'), undefined)
  })

  it('falls back to the go command', () => {
    assert.equal(goCommand(), 'go')
    configure({ alternateTools: { go: '/opt/go' } })
    assert.equal(goCommand(), '/opt/go')
  })
})

describe('goBuildFlags', () => {
  it('appends the build tags', () => {
    configure({ buildFlags: ['-v'], buildTags: 'tag' })
    assert.deepEqual(goBuildFlags(), ['-v', '-tags', 'tag'])
  })
})

describe('goTestFlags', () => {
  it('falls back to the build flags and adds the timeout', () => {
    configure({ buildFlags: ['-v'], testTimeout: '30s' })
    assert.deepEqual(goTestFlags(), ['-v', '-timeout', '30s'])
  })

  it('prefers the test flags and tags', () => {
    configure({ testFlags: ['-race'], buildFlags: ['-v'], testTags: 'test', testTimeout: '30s' })
    assert.deepEqual(goTestFlags(), ['-race', '-tags', 'test', '-timeout', '30s'])
  })
})

describe('goTestEnvironment', () => {
  it('merges the env file under the explicit variables', () => {
    const envFile = join(directory, 'test.env')
    writeFileSync(envFile, 'FROM_FILE=file\nSHARED=file\n')
    configure({ testEnvFile: envFile, testEnvVars: { SHARED: 'setting', FROM_SETTING: '1' } })
    assert.deepEqual(goTestEnvironment(), {
      FROM_FILE: 'file',
      SHARED: 'setting',
      FROM_SETTING: '1',
    })
  })

  it('warns instead of failing when the env file is missing', () => {
    configure({ testEnvFile: join(directory, 'missing.env') })
    assert.deepEqual(goTestEnvironment(), {})
    assert.equal(messages.length, 1)
    assert.match(messages[0], /Unable to read go\.testEnvFile/)
  })
})
