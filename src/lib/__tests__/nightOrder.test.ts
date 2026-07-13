import { describe, it, expect } from 'vitest'
import {
  FIRST_NIGHT,
  OTHER_NIGHTS,
  getNightOrder,
  NightOrderEntry,
} from '../nightOrder'

const roleIds = (entries: NightOrderEntry[]) =>
  entries.filter((e) => e.kind === 'role').map((e) => (e as { roleId: string }).roleId)

const markerIds = (entries: NightOrderEntry[]) =>
  entries.filter((e) => e.kind === 'marker').map((e) => (e as { id: string }).id)

describe('nightOrder table', () => {
  it('module loads with both night tables', () => {
    expect(Array.isArray(FIRST_NIGHT)).toBe(true)
    expect(Array.isArray(OTHER_NIGHTS)).toBe(true)
  })

  it('first-night role entries are in canonical order', () => {
    expect(roleIds(FIRST_NIGHT)).toEqual([
      'poisoner',
      'washerwoman',
      'librarian',
      'investigator',
      'chef',
      'empath',
      'fortune_teller',
      'butler',
      'spy',
    ])
  })

  it('other-nights role entries are in canonical order', () => {
    expect(roleIds(OTHER_NIGHTS)).toEqual([
      'poisoner',
      'monk',
      'scarlet_woman',
      'imp',
      'ravenkeeper',
      'undertaker',
      'empath',
      'fortune_teller',
      'butler',
      'spy',
    ])
  })

  it('first/other tables are bookended by Dusk and Dawn', () => {
    for (const table of [FIRST_NIGHT, OTHER_NIGHTS]) {
      expect(table[0]).toEqual({ kind: 'marker', id: 'dusk' })
      expect(table[table.length - 1]).toEqual({ kind: 'marker', id: 'dawn' })
    }
  })
})

describe('getNightOrder filtering', () => {
  it('keeps only in-play role entries and always keeps Dusk/Dawn', () => {
    // poisoner (minion) + imp (demon) + chef/empath (townsfolk)
    const bag = ['poisoner', 'imp', 'chef', 'empath']
    const result = getNightOrder('first', bag)

    // role rows filtered to the ones that appear on the first night
    expect(roleIds(result)).toEqual(['poisoner', 'chef', 'empath'])
    // Dusk/Dawn preserved
    expect(markerIds(result)).toContain('dusk')
    expect(markerIds(result)).toContain('dawn')
  })

  it('keeps minion_info / demon_info when the bag has a minion / demon', () => {
    const result = getNightOrder('first', ['poisoner', 'imp', 'chef'])
    expect(markerIds(result)).toContain('minion_info')
    expect(markerIds(result)).toContain('demon_info')
  })

  it('drops minion_info / demon_info when the bag has neither', () => {
    // townsfolk-only bag: no minion, no demon
    const result = getNightOrder('first', ['chef', 'empath', 'washerwoman'])
    expect(markerIds(result)).not.toContain('minion_info')
    expect(markerIds(result)).not.toContain('demon_info')
    // Dusk/Dawn still there
    expect(markerIds(result)).toEqual(['dusk', 'dawn'])
  })

  it('other-nights filters roles and preserves markers too', () => {
    const result = getNightOrder('other', ['imp', 'monk'])
    expect(roleIds(result)).toEqual(['monk', 'imp'])
    expect(markerIds(result)).toEqual(['dusk', 'dawn'])
  })
})
