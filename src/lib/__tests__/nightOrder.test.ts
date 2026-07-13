import { describe, it, expect } from 'vitest'
import { getNightOrder, NightOrderEntry } from '../nightOrder'

const roleIds = (entries: NightOrderEntry[]) =>
  entries.filter((e) => e.kind === 'role').map((e) => (e as { roleId: string }).roleId)

const markerIds = (entries: NightOrderEntry[]) =>
  entries.filter((e) => e.kind === 'marker').map((e) => (e as { id: string }).id)

const stepIds = (entries: NightOrderEntry[]) =>
  entries.filter((e) => e.kind === 'step').map((e) => (e as { id: string }).id)

// A bag containing every character the calculator knows about, so a single call
// exercises the full ordering for that night.
const ALL = [
  'poisoner',
  'washerwoman',
  'librarian',
  'investigator',
  'chef',
  'empath',
  'fortune_teller',
  'butler',
  'spy',
  'monk',
  'scarlet_woman',
  'imp',
  'ravenkeeper',
  'undertaker',
]

describe('getNightOrder ordering', () => {
  it('orders first-night wakers canonically', () => {
    expect(roleIds(getNightOrder('first', ALL))).toEqual([
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

  it('orders other-night wakers canonically', () => {
    expect(roleIds(getNightOrder('other', ALL))).toEqual([
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

  it('bookends every night with Dusk and Dawn', () => {
    for (const which of ['first', 'other'] as const) {
      const r = getNightOrder(which, ALL)
      expect(r[0]).toEqual({ kind: 'marker', id: 'dusk' })
      expect(r[r.length - 1]).toEqual({ kind: 'marker', id: 'dawn' })
    }
  })
})

describe('getNightOrder filtering', () => {
  it('keeps only in-play wakers', () => {
    const result = getNightOrder('first', ['poisoner', 'imp', 'chef', 'empath'])
    expect(roleIds(result)).toEqual(['poisoner', 'chef', 'empath'])
    expect(markerIds(result)).toEqual(['dusk', 'dawn'])
  })

  it('emits minion/demon info steps (first night) when the bag has those teams', () => {
    const result = getNightOrder('first', ['poisoner', 'imp', 'chef'])
    expect(stepIds(result)).toEqual(['minion_info', 'demon_info'])
    // and they sort before the role wakers
    const kinds = result.map((e) => e.kind)
    expect(kinds.indexOf('step')).toBeLessThan(kinds.lastIndexOf('role'))
  })

  it('drops the info steps when the bag has neither minion nor demon', () => {
    const result = getNightOrder('first', ['chef', 'empath', 'washerwoman'])
    expect(stepIds(result)).toEqual([])
  })

  it('never emits info steps on other nights', () => {
    const result = getNightOrder('other', ['poisoner', 'imp', 'monk'])
    expect(stepIds(result)).toEqual([])
    expect(roleIds(result)).toEqual(['poisoner', 'monk', 'imp'])
  })
})
