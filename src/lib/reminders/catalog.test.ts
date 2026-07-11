import { describe, it, expect } from 'vitest'
import { getCharacterReminders, getAllReminders } from './catalog'
import { makeState, makePlayer } from '../__tests__/helpers'

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

  it('de-dupes shared labels and appends the generic markers last', () => {
    const state = makeState({
      players: [
        makePlayer({ roleId: 'poisoner' }),
        makePlayer({ roleId: 'washerwoman' }),
      ],
    })

    const reminders = getAllReminders(state)
    const labels = reminders.map((r) => r.label)

    // No duplicate labels
    expect(labels.length).toBe(new Set(labels).size)

    // Generic markers appended at the end, in order
    expect(labels.slice(-3)).toEqual(['Good', 'Evil', 'Custom'])
  })
})
