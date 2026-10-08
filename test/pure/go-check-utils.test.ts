import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { describe, it } from 'node:test'
import { lintArguments, parseProblems } from '../../src/go-check-utils.ts'

describe('parseProblems', () => {
  it('parses a diagnostic with a column', () => {
    assert.deepEqual(parseProblems('main.go:3:5: undefined: x', '/w'), [
      { file: resolve('/w', 'main.go'), line: 3, column: 5, message: 'undefined: x' },
    ])
  })

  it('defaults the column to 1', () => {
    assert.deepEqual(parseProblems('main.go:3: undefined: x', '/w'), [
      { file: resolve('/w', 'main.go'), line: 3, column: 1, message: 'undefined: x' },
    ])
  })

  it('strips the vet prefix', () => {
    assert.deepEqual(parseProblems('vet: main.go:3:5: undefined: x', '/w'), [
      { file: resolve('/w', 'main.go'), line: 3, column: 5, message: 'undefined: x' },
    ])
  })

  it('skips package headers and empty messages', () => {
    assert.deepEqual(parseProblems('# example.com/x\nmain.go:1:1:', '/w'), [])
    assert.deepEqual(parseProblems('', '/w'), [])
  })

  it('does not split a Windows drive letter into the column', () => {
    const problems = parseProblems('C:\\x\\y.go:1:2: msg', '/w')
    assert.deepEqual(problems, [
      { file: resolve('/w', 'C:\\x\\y.go'), line: 1, column: 2, message: 'msg' },
    ])
  })
})

describe('lintArguments', () => {
  it('inserts the run subcommand for golangci-lint', () => {
    assert.deepEqual(lintArguments('golangci-lint', ['-v'], './...'), ['run', '-v', './...'])
    assert.deepEqual(lintArguments('golangci-lint-v2', [], '.'), ['run', '.'])
  })

  it('passes the flags straight through for other tools', () => {
    assert.deepEqual(lintArguments('staticcheck', ['-checks=x'], './...'), ['-checks=x', './...'])
    assert.deepEqual(lintArguments('revive', [], '.'), ['.'])
  })
})
