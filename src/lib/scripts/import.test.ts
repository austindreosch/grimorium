import { describe, it, expect } from 'vitest'
import { parseScriptJson } from './import'

describe('parseScriptJson', () => {
  it('parses a bare id list', () => {
    const r = parseScriptJson('["washerwoman","chef","imp"]')
    expect(r.roles).toEqual(['washerwoman', 'chef', 'imp'])
    expect(r.dropped).toEqual([])
  })

  it('matches official no-underscore ids to our snake_case ids', () => {
    const r = parseScriptJson('["fortuneteller","scarletwoman"]')
    expect(r.roles).toEqual(['fortune_teller', 'scarlet_woman'])
  })

  it('captures name/author from a _meta header and skips it', () => {
    const r = parseScriptJson(
      '[{"id":"_meta","name":"My Script","author":"Me"},"chef"]',
    )
    expect(r.name).toBe('My Script')
    expect(r.author).toBe('Me')
    expect(r.roles).toEqual(['chef'])
  })

  it('reads object entries and collects unknown roles in dropped', () => {
    const r = parseScriptJson('[{"id":"chef"},{"id":"boffin"},"pixie"]')
    expect(r.roles).toEqual(['chef'])
    expect(r.dropped).toEqual(['boffin', 'pixie'])
  })

  it('de-duplicates repeated roles', () => {
    const r = parseScriptJson('["chef","chef","chef"]')
    expect(r.roles).toEqual(['chef'])
  })

  it('throws on non-JSON and non-array input', () => {
    expect(() => parseScriptJson('not json')).toThrow('invalid_json')
    expect(() => parseScriptJson('{"id":"chef"}')).toThrow('not_an_array')
  })
})
