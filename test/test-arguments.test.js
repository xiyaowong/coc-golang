'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const { testArgumentsAtCursor, testArgumentsForLine } = require('../lib/go-test-utils')

test('selects a Go test on the current line', () => {
  assert.deepEqual(testArgumentsForLine('func TestParse(t *testing.T) {'), ['-run', '^TestParse$'])
})

test('selects benchmarks without running ordinary tests', () => {
  assert.deepEqual(
    testArgumentsForLine('func BenchmarkEncode(b *testing.B) {'),
    ['-run', '^$', '-bench', '^BenchmarkEncode$']
  )
})

test('supports named examples and package examples', () => {
  assert.deepEqual(testArgumentsForLine('func ExampleWidget_Run() {'), ['-run', '^ExampleWidget_Run$'])
  assert.deepEqual(testArgumentsForLine('func Example() {'), ['-run', '^Example$'])
})

test('ignores non-test functions and declarations', () => {
  assert.equal(testArgumentsForLine('func parse(t *testing.T) {'), undefined)
  assert.equal(testArgumentsForLine('func TestParse'), undefined)
})

test('selects the enclosing test function from its body', () => {
  assert.deepEqual(
    testArgumentsAtCursor(['func TestParse(t *testing.T) {', '\tparseInput()', '}']),
    ['-run', '^TestParse$']
  )
})

test('does not select an outer test from inside a helper function', () => {
  assert.equal(
    testArgumentsAtCursor(['func TestParse(t *testing.T) {', '\tfunc helper() {', '\t\tparseInput()', '\t}']),
    undefined
  )
})
