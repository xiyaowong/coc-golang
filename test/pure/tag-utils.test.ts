import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { parseTagAndOptionInput } from '../../src/tag-utils.ts'

describe('parseTagAndOptionInput', () => {
  it('parses single tag', () => {
    const result = parseTagAndOptionInput('json')
    assert.deepEqual(result, {
      tags: ['json'],
      options: [],
    })
  })

  it('splits mixed tags and options', () => {
    const result = parseTagAndOptionInput('json,json=omitempty,xml=attr')
    assert.deepEqual(result, {
      tags: ['json'],
      options: ['json=omitempty', 'xml=attr'],
    })
  })

  it('handles static tag values with colons', () => {
    const result = parseTagAndOptionInput('json,validate:gt=1,scope:read-only')
    assert.deepEqual(result, {
      tags: ['json', 'validate:gt=1', 'scope:read-only'],
      options: [],
    })
  })

  it('handles array input and trims whitespace', () => {
    const result = parseTagAndOptionInput([' json ', ' json=omitempty , xml=attr '])
    assert.deepEqual(result, {
      tags: ['json'],
      options: ['json=omitempty', 'xml=attr'],
    })
  })

  it('returns empty lists for empty input', () => {
    const result = parseTagAndOptionInput('')
    assert.deepEqual(result, {
      tags: [],
      options: [],
    })
  })
})
