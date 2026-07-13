import { describe, it, expect } from 'vitest'
import en from '../i18n/translations/en'
import { INFO_TOKEN_PRESETS, searchPresets } from './catalog'

describe('info token catalog', () => {
  it('returns the full catalog for an empty query', () => {
    expect(searchPresets('', en)).toEqual(INFO_TOKEN_PRESETS)
    expect(searchPresets('   ', en)).toEqual(INFO_TOKEN_PRESETS)
  })

  it('filters by localized label, case-insensitively', () => {
    const hits = searchPresets('demon', en)
    expect(hits.length).toBe(1)
    expect(hits[0].id).toBe('theDemon')
    expect(searchPresets('zzzznope', en)).toHaveLength(0)
  })
})
