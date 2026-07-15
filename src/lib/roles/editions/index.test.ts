import { describe, it, expect } from 'vitest'
import { EDITION_ROLES } from './index'
import { getRole } from '../index'
import { getRoleName, getRoleAbility } from '../../i18n/registry'
import { getScript } from '../../scripts'
import { getCharacterReminders, getAllReminders } from '../../reminders/catalog'
import { getNightOrder } from '../../nightOrder'

describe('base-box editions (S&V + BMR) + full catalog', () => {
  it('registers every manual-only character (SNV+BMR = 50, plus the catalog)', () => {
    // SNV (25) + BMR (25) + the catalog of all other official characters
    // (Experimental, Fabled, Travellers). Guards against silent shrinkage.
    expect(EDITION_ROLES.length).toBeGreaterThanOrEqual(50)
    // Manual board: none wake in the guided engine.
    for (const r of EDITION_ROLES) {
      const def = getRole(r.id)
      expect(def, r.id).toBeDefined()
      expect(def?.nightOrder).toBeNull()
      expect(def?.NightAction).toBeNull()
    }
  })

  it('resolves catalog characters across teams (Experimental, Fabled, Traveller)', () => {
    // Regression guard for the "any script imports" feature: these previously
    // had no data and were dropped on import.
    for (const id of ['banshee', 'kazali', 'ojo', 'high_priestess']) {
      expect(getRole(id), id).toBeDefined()
    }
    expect(getRole('bishop')?.team).toBe('traveller')
    expect(getRole('doomsayer')?.team).toBe('fabled')
  })

  it('each character has a registered name + ability', () => {
    for (const r of EDITION_ROLES) {
      expect(getRoleName(r.id, 'en'), r.id).toBe(r.name)
      expect(getRoleAbility(r.id, 'en').length, r.id).toBeGreaterThan(0)
    }
  })

  it('each script lists its 25 characters', () => {
    expect(getScript('sects-and-violets').roles).toHaveLength(25)
    expect(getScript('bad-moon-rising').roles).toHaveLength(25)
  })

  it('surfaces edition reminder tokens without breaking the generic tail', () => {
    // Poisoner-style mechanical token from BMR (Sailor -> Drunk).
    expect(getCharacterReminders('sailor').map((r) => r.label)).toContain('Drunk')
    const labels = getAllReminders().map((r) => r.label)
    expect(labels).toContain('Drunk')
    expect(labels.at(-1)).toBe('Custom')
  })

  it('places waking edition characters in the night order', () => {
    // Poisoner (17) precedes the Sailor-less first night; Sailor acts first night.
    const first = getNightOrder('first', ['sailor', 'poisoner']).filter(
      (e) => e.kind === 'role',
    )
    expect(first.map((e) => (e.kind === 'role' ? e.roleId : ''))).toEqual([
      'sailor',
      'poisoner',
    ])
  })
})
