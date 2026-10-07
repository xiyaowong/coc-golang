'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const manifest = require('../package.json')

test('activates for Go source, module, and workspace files', () => {
  assert.deepEqual(manifest.activationEvents, [
    'onLanguage:go',
    'onLanguage:gomod',
    'onLanguage:gowork',
  ])
})

test('declares each registered Go command', () => {
  assert.deepEqual(
    manifest.contributes.commands.map(command => command.command),
    [
      'go.test.package',
      'go.test.workspace',
      'go.test.cursor',
      'go.test.previous',
      'go.gopls.install',
    ]
  )
})
