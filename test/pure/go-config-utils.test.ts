import type { GoplsSettings } from '../../src/go-config-utils.ts'
import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  buildFlagsWithTags,
  goplsConfiguration,

  inferGopath,
  parseEnvFile,
  pathKey,
  prependPath,
  testFlagsFor,
} from '../../src/go-config-utils.ts'

function settings(overrides: Partial<GoplsSettings> = {}): GoplsSettings {
  return {
    buildFlags: [],
    buildTags: '',
    inlayHints: {},
    runTestCodeLens: true,
    ...overrides,
  }
}

describe('buildFlagsWithTags', () => {
  it('appends the tags', () => {
    assert.deepEqual(buildFlagsWithTags(['-v'], 'tag'), ['-v', '-tags', 'tag'])
  })

  it('leaves an existing -tags flag alone', () => {
    assert.deepEqual(buildFlagsWithTags(['-tags=x'], 'tag'), ['-tags=x'])
    assert.deepEqual(buildFlagsWithTags(['-tags', 'x'], 'tag'), ['-tags', 'x'])
  })

  it('does not append an empty tag set', () => {
    assert.deepEqual(buildFlagsWithTags(['-v'], ''), ['-v'])
  })
})

describe('testFlagsFor', () => {
  it('prefers the test flags and test tags over the build ones', () => {
    assert.deepEqual(
      testFlagsFor({
        testFlags: ['-race'],
        buildFlags: ['-v'],
        testTags: 'test',
        buildTags: 'build',
        testTimeout: '30s',
      }),
      ['-race', '-tags', 'test', '-timeout', '30s'],
    )
  })

  it('falls back to the build flags and tags', () => {
    assert.deepEqual(
      testFlagsFor({
        testFlags: null,
        buildFlags: ['-v'],
        testTags: null,
        buildTags: 'build',
        testTimeout: '30s',
      }),
      ['-v', '-tags', 'build', '-timeout', '30s'],
    )
  })

  it('does not add a second timeout flag', () => {
    assert.deepEqual(
      testFlagsFor({
        testFlags: ['-timeout', '5s'],
        buildFlags: [],
        testTags: null,
        buildTags: '',
        testTimeout: '30s',
      }),
      ['-timeout', '5s'],
    )
  })
})

describe('parseEnvFile', () => {
  it('parses the dotenv subset used by go.testEnvFile', () => {
    assert.deepEqual(
      parseEnvFile([
        '# comment',
        '',
        'export FOO=bar',
        'BAZ=" q "',
        'QUOTED=\'v\'',
        'X=1 2 ',
        'NOEQUALS',
      ].join('\n')),
      { FOO: 'bar', BAZ: ' q ', QUOTED: 'v', X: '1 2' },
    )
  })
})

describe('inferGopath', () => {
  it('returns the part before the last src segment', () => {
    assert.equal(inferGopath('/home/u/go/src/github.com/x/y'), '/home/u/go')
  })

  it('keeps the original separators on Windows paths', () => {
    assert.equal(inferGopath('D:\\go\\src\\x'), 'D:\\go')
  })

  it('returns undefined without an inner src segment', () => {
    assert.equal(inferGopath('/home/u/go'), undefined)
  })
})

describe('pathKey and prependPath', () => {
  it('finds the existing, case-insensitive PATH key', () => {
    assert.equal(pathKey({ Path: '/usr/bin' }), 'Path')
    assert.equal(pathKey({}), 'PATH')
  })

  it('prepends without a leading separator', () => {
    const environment: NodeJS.ProcessEnv = {}
    prependPath(environment, '/bin', ':')
    assert.equal(environment.PATH, '/bin')

    prependPath(environment, '/go/bin', ':')
    assert.equal(environment.PATH, '/go/bin:/bin')
  })
})

describe('goplsConfiguration', () => {
  it('forwards build flags and tags to gopls', () => {
    const options = goplsConfiguration({}, settings({ buildFlags: ['-v'], buildTags: 'tag' }))
    assert.deepEqual(options['build.buildFlags'], ['-v', '-tags', 'tag'])
  })

  it('does not overwrite gopls settings the user already specified', () => {
    const options = goplsConfiguration(
      { 'build.buildFlags': ['-x'] },
      settings({ buildFlags: ['-v'] }),
    )
    assert.deepEqual(options['build.buildFlags'], ['-x'])
  })

  it('merges the test code lens setting into the defaults', () => {
    const options = goplsConfiguration({}, settings({ runTestCodeLens: false }))
    assert.deepEqual(options.codelenses, {
      generate: true,
      run_govulncheck: true,
      test: false,
      tidy: true,
      upgrade_dependency: true,
      vendor: true,
    })
  })

  it('keeps the user codelens key and values', () => {
    const options = goplsConfiguration(
      { 'ui.codelenses': { tidy: false } },
      settings(),
    )
    assert.equal(options.codelenses, undefined)
    assert.deepEqual(options['ui.codelenses'], {
      generate: true,
      run_govulncheck: true,
      test: true,
      tidy: false,
      upgrade_dependency: true,
      vendor: true,
    })
  })
})
