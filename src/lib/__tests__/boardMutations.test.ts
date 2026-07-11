import { describe, it, expect, beforeEach } from 'vitest'
import { moveEffectInstance, removeEffectInstance } from '../game'
import { getCurrentState } from '../types'
import { makePlayer, addEffectTo, makeState, makeGame, resetPlayerCounter } from './helpers'

// The board drags reminder pips between players. Because every marker pip shares
// the effect type `reminder`, these mutations must operate on a single instance
// by id — never by type — and must not disturb a player's other pips.

describe('removeEffectInstance', () => {
  beforeEach(resetPlayerCounter)

  it('removes only the targeted instance, leaving same-type siblings', () => {
    let dan = makePlayer({ id: 'dan', roleId: 'poisoner' })
    dan = addEffectTo(dan, 'reminder', { label: 'Townsfolk' })
    dan = addEffectTo(dan, 'reminder', { label: 'Wrong' })
    const target = dan.effects[0]
    const game = makeGame(makeState({ players: [dan] }))

    const after = getCurrentState(removeEffectInstance(game, 'dan', target.id))
    const labels = after.players[0].effects.map((e) => e.data?.label)
    expect(after.players[0].effects).toHaveLength(1)
    expect(labels).toEqual(['Wrong'])
  })

  it('is a no-op when the instance id is not found', () => {
    const dan = addEffectTo(makePlayer({ id: 'dan' }), 'poisoned')
    const game = makeGame(makeState({ players: [dan] }))
    const after = removeEffectInstance(game, 'dan', 'nope')
    expect(after).toBe(game)
  })
})

describe('moveEffectInstance', () => {
  beforeEach(resetPlayerCounter)

  it('moves one instance atomically: source loses it, target gains an equivalent', () => {
    let dan = makePlayer({ id: 'dan' })
    dan = addEffectTo(dan, 'reminder', { label: 'Outsider', icon: 'userX' })
    const eve = makePlayer({ id: 'eve' })
    const moved = dan.effects[0]
    const game = makeGame(makeState({ players: [dan, eve] }))

    const after = getCurrentState(moveEffectInstance(game, 'dan', 'eve', moved.id))
    const danAfter = after.players.find((p) => p.id === 'dan')!
    const eveAfter = after.players.find((p) => p.id === 'eve')!

    expect(danAfter.effects).toHaveLength(0)
    expect(eveAfter.effects).toHaveLength(1)
    expect(eveAfter.effects[0].type).toBe('reminder')
    expect(eveAfter.effects[0].data).toEqual({ label: 'Outsider', icon: 'userX' })
    // A fresh instance id, not the source's.
    expect(eveAfter.effects[0].id).not.toBe(moved.id)
  })

  it("does not disturb the target's existing pips", () => {
    let dan = addEffectTo(makePlayer({ id: 'dan' }), 'poisoned')
    let eve = makePlayer({ id: 'eve' })
    eve = addEffectTo(eve, 'reminder', { label: 'Master' })
    const moved = dan.effects[0]
    const game = makeGame(makeState({ players: [dan, eve] }))

    const after = getCurrentState(moveEffectInstance(game, 'dan', 'eve', moved.id))
    const eveAfter = after.players.find((p) => p.id === 'eve')!
    const types = eveAfter.effects.map((e) => e.type).sort()
    expect(types).toEqual(['poisoned', 'reminder'])
  })
})
