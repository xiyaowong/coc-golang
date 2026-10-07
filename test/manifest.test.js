'use strict'

const test = require('node:test')
const assert = require('node:assert/strict')
const manifest = require('../package.json')

test('activates for Go source, module, and workspace files', () => {
  for (const event of ['onLanguage:go', 'onLanguage:gomod', 'onLanguage:gowork']) {
    assert.ok(manifest.activationEvents.includes(event), `Missing activation event: ${event}`)
  }
})

test('declares each registered Go command', () => {
  const commands = manifest.contributes.commands.map(command => command.command)
  assert.equal(new Set(commands).size, commands.length)
  for (const command of [
    'go.test.package',
    'go.test.cursor',
    'go.test.previous',
    'go.benchmark.package',
    'go.gopls.install',
    'go.test.generate.file',
    'go.tags.add',
    'go.impl.cursor',
    'go.build.workspace',
    'go.tools.install.staticcheck',
  ]) {
    assert.ok(commands.includes(command), `Missing command declaration: ${command}`)
  }
})
