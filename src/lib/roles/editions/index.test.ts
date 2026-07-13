import { describe, it, expect } from 'vitest'
import { EDITION_ROLES } from './index'
import { getRole } from '../index'
import { getRoleName, getRoleAbility } from '../../i18n/registry'
import { getScript } from '../../scripts'
import { getCharacterReminders, getAllReminders } from '../../reminders/catalog'
import { getNightOrder } from '../../nightOrder'

describe('base-box editions (S&V + BMR)', () => {
  it('registers 50 manual-only characters (25 each)', () => {
    expect(EDITION_ROLES).toHaveLength(50)
    // Manual board: none wake in the guided engine.
    for (const r of EDITION_ROLES) {
      const def = getRole(r.id)
      expect(def, r.id).toBeDefined()
      expect(def?.nightOrder).toBeNull()
      expect(def?.NightAction).toBeNull()
    }
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
    expect(labels.length).toBe(new Set(labels).size)
    expect(labels.slice(-3)).toEqual(['Good', 'Evil', 'Custom'])
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
