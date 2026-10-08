import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  escapeRegExp,
  functionNameAtCursor,
  testArgumentsAtCursor,
  testArgumentsForFile,
  testArgumentsForLine,
  testNameAtCursor,
} from '../../src/go-test-utils.ts'

describe('testArgumentsForLine', () => {
  it('anchors the pattern to a single test', () => {
    assert.deepEqual(testArgumentsForLine('func TestFoo(t *testing.T) {'), ['-run', '^TestFoo$'])
  })

  it('runs a benchmark through -bench with an empty -run', () => {
    assert.deepEqual(
      testArgumentsForLine('func BenchmarkFoo(b *testing.B) {'),
      ['-run', '^$', '-bench', '^BenchmarkFoo$'],
    )
  })

  it('runs an example as a test', () => {
    assert.deepEqual(testArgumentsForLine('func ExampleFoo() {'), ['-run', '^ExampleFoo$'])
  })

  it('ignores lines that declare no test', () => {
    assert.equal(testArgumentsForLine('func helper() {}'), undefined)
    assert.equal(testArgumentsForLine('// func TestFoo(t *testing.T) {}'), undefined)
  })
})

describe('testArgumentsForFile', () => {
  const lines = [
    'package main',
    'func TestA(t *testing.T) {}',
    'func TestB(t *testing.T) {}',
    'func BenchmarkC(b *testing.B) {}',
  ]

  it('joins every test name into one pattern', () => {
    assert.deepEqual(testArgumentsForFile(lines), ['-run', '^(TestA|TestB)$'])
  })

  it('selects only benchmarks when asked', () => {
    assert.deepEqual(
      testArgumentsForFile(lines, { benchmarks: true }),
      ['-run', '^$', '-bench', '^(BenchmarkC)$'],
    )
  })

  it('returns undefined when nothing matches', () => {
    assert.equal(testArgumentsForFile(['func TestA(t *testing.T) {}'], { benchmarks: true }), undefined)
  })
})

describe('cursor helpers', () => {
  it('uses the last function declaration in the slice', () => {
    const lines = ['func TestA(t *testing.T) {', '\tassert.True(t, true)', '']
    assert.equal(testNameAtCursor(lines), 'TestA')
    assert.deepEqual(testArgumentsAtCursor(lines), ['-run', '^TestA$'])
  })

  it('reads the name of a method declaration', () => {
    assert.equal(functionNameAtCursor(['func (s *Suite) TestB(t *testing.T) {']), 'TestB')
  })

  it('reports a name only when it starts with Test', () => {
    assert.equal(testNameAtCursor(['func BenchmarkA(b *testing.B) {']), undefined)
    assert.equal(testNameAtCursor(['func ExampleA() {']), undefined)
  })
})

describe('escapeRegExp', () => {
  it('escapes regex metacharacters and leaves plain names alone', () => {
    assert.equal(escapeRegExp('Test[a].x'), 'Test\\[a\\]\\.x')
    assert.equal(escapeRegExp('TestFoo'), 'TestFoo')
  })
})
