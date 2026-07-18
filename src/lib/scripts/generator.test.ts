import { describe, it, expect } from 'vitest'
import { SCRIPTS } from './index'
import { generateRolePools } from './generator'

describe('generateRolePools — outsider-light scripts with Baron', () => {
  // No Greater Joy has only 2 outsiders (Drunk, Klutz). Baron wants +2, which
  // would demand 3 outsiders — impossible. The generator must still be able to
  // pick Baron by capping outsiders at what the script has.
  const script = SCRIPTS['no-greater-joy']

  it('has exactly 2 outsiders in the pool (regression guard)', () => {
    const outsiders = script.roles.filter((r) => r === 'drunk' || r === 'klutz')
    expect(outsiders).toHaveLength(2)
  })

  it('can generate pools containing the Baron', () => {
    for (const playerCount of [7, 8, 9]) {
      const pools = generateRolePools(script, playerCount, 40)
      expect(pools.length).toBeGreaterThan(0)
      const withBaron = pools.filter((p) => p.roles.includes('baron'))
      expect(withBaron.length).toBeGreaterThan(0)
    }
  })

  it('never exceeds the 2 available outsiders even with Baron', () => {
    const pools = generateRolePools(script, 9, 40)
    for (const pool of pools) {
      expect(pool.distribution.outsider).toBeLessThanOrEqual(2)
    }
  })
})
