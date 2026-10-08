import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { quoteShellArg, shellCommandLine, shellKind } from '../../src/shell-utils.ts'

describe('shell utils', () => {
  it('detects the shell kind', () => {
    assert.equal(shellKind('/bin/zsh'), 'posix')
    assert.equal(shellKind('C:\\Windows\\System32\\cmd.exe'), 'cmd')
    assert.equal(shellKind('pwsh'), 'powershell')
    assert.equal(shellKind('C:\\Program Files\\PowerShell\\7\\pwsh.exe'), 'powershell')
  })

  it('quotes posix arguments', () => {
    assert.equal(quoteShellArg('./...', 'posix'), './...')
    assert.equal(quoteShellArg('^TestA$', 'posix'), `'^TestA$'`)
    assert.equal(quoteShellArg(`it's`, 'posix'), `'it'\\''s'`)
  })

  it('quotes PowerShell arguments', () => {
    assert.equal(quoteShellArg(`it's`, 'powershell'), `'it''s'`)
  })

  it('quotes cmd arguments', () => {
    assert.equal(quoteShellArg('a b', 'cmd'), '"a b"')
    assert.equal(quoteShellArg('say "hi"', 'cmd'), '"say ""hi"""')
  })

  it('builds command lines', () => {
    assert.equal(shellCommandLine('go', ['test', '-run', '^A$'], 'posix'), `go test -run '^A$'`)
    assert.equal(shellCommandLine('go', ['test', '-run', '^A$'], 'powershell'), `& 'go' 'test' '-run' '^A$'`)
  })
})
