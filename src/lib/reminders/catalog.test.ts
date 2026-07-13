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

  it('offers the whole catalog regardless of who is in play, de-duped, generics last', () => {
    const reminders = getAllReminders()
    const labels = reminders.map((r) => r.label)

    // No duplicate labels
    expect(labels.length).toBe(new Set(labels).size)

    // Full catalog, not filtered to in-play roles: reminders from characters
    // that need not be seated are present (e.g. the Washerwoman's).
    expect(labels).toContain('Townsfolk')
    expect(labels).toContain('Poisoned')

    // Generic markers appended at the end, in order
    expect(labels.slice(-3)).toEqual(['Good', 'Evil', 'Custom'])
  })
})
