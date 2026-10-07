'use strict'

function functionNameAtLine(line) {
  const match = /^\s*func\s+(Test(?:[A-Z]\w*)?|Benchmark(?:[A-Z]\w*)?|Example(?:[A-Z]\w*|_[a-z]\w*)?)\s*\(/.exec(line)
  return match?.[1]
}

function escapeRegExp(name) {
  return name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function testArgumentsForLine(line) {
  const name = functionNameAtLine(line)
  if (!name) return undefined

  const escaped = escapeRegExp(name)
  if (name.startsWith('Benchmark')) {
    return ['-run', '^$', '-bench', `^${escaped}$`]
  }
  return ['-run', `^${escaped}$`]
}

function testArgumentsForFile(lines, benchmarks = false) {
  const names = []
  for (const line of lines) {
    const name = functionNameAtLine(line)
    if (!name || name.startsWith('Benchmark') !== benchmarks) continue
    names.push(escapeRegExp(name))
  }
  if (names.length === 0) return undefined

  const pattern = `^(${names.join('|')})$`
  return benchmarks
    ? ['-run', '^$', '-bench', pattern]
    : ['-run', pattern]
}

function testArgumentsAtCursor(lines) {
  if (!Array.isArray(lines)) lines = String(lines || '').split('\n')
  for (let index = lines.length - 1; index >= 0; index--) {
    if (/^\s*func\s+(?:\([^)]*\)\s*)?[A-Za-z_]\w*\s*\(/.test(lines[index])) {
      return testArgumentsForLine(lines[index])
    }
  }
  return undefined
}

module.exports = { testArgumentsAtCursor, testArgumentsForFile, testArgumentsForLine }
