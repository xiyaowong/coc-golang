'use strict'

function testArgumentsForLine(line) {
  const match = /^\s*func\s+(Test[A-Z0-9]\w*|Benchmark[A-Z0-9]\w*|Example(?:_[A-Za-z0-9]+|[A-Z0-9]\w*)?)\s*\(/.exec(line)
  if (!match) return undefined

  const name = match[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  if (name.startsWith('Benchmark')) {
    return ['-run', '^$', '-bench', `^${name}$`]
  }
  return ['-run', `^${name}$`]
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

module.exports = { testArgumentsAtCursor, testArgumentsForLine }
