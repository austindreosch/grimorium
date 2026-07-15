import { describe, it, expect } from 'vitest'
import { getCharacterReminders, getAllReminders } from './catalog'

describe('reminders catalog', () => {
  it('returns mechanical reminders with their effectType', () => {
    const reminders = getCharacterReminders('poisoner')
    const poisoned = reminders.find((r) => r.label === 'Poisoned')
    expect(poisoned).toBeDefined()
    expect(poisoned?.effectType).toBe('poisoned')
  })

  it('returns an empty list for roles with no reminders', () => {
    expect(getCharacterReminders('villager')).toEqual([])
  })

  it('offers the whole catalog regardless of who is in play, image-only, Custom last', () => {
    const reminders = getAllReminders()

    // Every offered token (bar the freehand Custom) is backed by official art —
    // no hand-drawn Good/Evil/Attack pips.
    for (const r of reminders) {
      if (r.label === 'Custom') continue
      expect(r.tokenSrc).toBeDefined()
    }

    // Full catalog, not filtered to in-play roles: reminders from characters
    // that need not be seated are present (e.g. the Washerwoman's).
    const labels = reminders.map((r) => r.label)
    expect(labels).toContain('Townsfolk')
    expect(labels).toContain('Poisoned')

    // Removed custom tokens are gone; the single freehand marker is appended last.
    expect(labels).not.toContain('Good')
    expect(labels).not.toContain('Evil')
    expect(labels.at(-1)).toBe('Custom')
  })
})
