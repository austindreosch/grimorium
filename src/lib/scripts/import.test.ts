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

  it('resolves official object + string entries (incl. experimental)', () => {
    // boffin/pixie are Experimental — now in the catalog, so they resolve.
    const r = parseScriptJson('[{"id":"chef"},{"id":"boffin"},"pixie"]')
    expect(r.roles).toEqual(['chef', 'boffin', 'pixie'])
    expect(r.dropped).toEqual([])
  })

  it('drops bare ids with no character data', () => {
    const r = parseScriptJson('[{"id":"chef"},"totally_made_up_role"]')
    expect(r.roles).toEqual(['chef'])
    expect(r.customs).toEqual([])
    expect(r.dropped).toEqual(['totally_made_up_role'])
  })

  it('captures inline homebrew characters (id + name) as customs', () => {
    const r = parseScriptJson(
      JSON.stringify([
        { id: 'my_guy', name: 'My Guy', team: 'traveler', ability: 'Does a thing.', image: 'http://x/y.png', firstNight: 5 },
        'chef',
      ]),
    )
    expect(r.roles).toEqual(['my_guy', 'chef'])
    expect(r.dropped).toEqual([])
    expect(r.customs).toHaveLength(1)
    const c = r.customs[0]
    expect(c).toMatchObject({
      id: 'my_guy',
      name: 'My Guy',
      team: 'traveller', // 'traveler' normalized
      ability: 'Does a thing.',
      image: 'http://x/y.png',
      firstNight: 5,
    })
  })

  it('official ids win over inline data of the same id', () => {
    const r = parseScriptJson('[{"id":"chef","name":"Fake Chef"}]')
    expect(r.roles).toEqual(['chef'])
    expect(r.customs).toEqual([])
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
