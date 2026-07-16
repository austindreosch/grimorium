import { describe, it, expect, beforeEach } from 'vitest'
import en from '../i18n/translations/en'
import { makePlayer, makeState, addEffectTo, resetPlayerCounter } from '../__tests__/helpers'
import { deckForPlayer } from './deck'

// Trouble Brewing ids: imp = demon, poisoner = minion, the rest townsfolk.
const script = ['imp', 'poisoner', 'empath', 'chef', 'washerwoman']

describe('deckForPlayer', () => {
  beforeEach(resetPlayerCounter)

  it('gives the demon a minions slide and a not-in-play bluffs slide', () => {
    const imp = makePlayer({ id: 'imp', roleId: 'imp' })
    const poisoner = makePlayer({ id: 'poi', roleId: 'poisoner' })
    const empath = makePlayer({ id: 'emp', roleId: 'empath' })
    const state = makeState({ players: [imp, poisoner, empath] })

    const deck = deckForPlayer(imp, state, script, en)
    const minions = deck.find((s) => s.id === 'minions')
    const bluffs = deck.find((s) => s.id === 'bluffs')

    expect(minions?.tokens).toEqual([{ kind: 'player', playerId: 'poi' }])
    // chef + washerwoman are good and not in play; imp/poisoner excluded.
    expect(bluffs?.tokens.map((t) => (t.kind === 'role' ? t.roleId : ''))).toEqual([
      'chef',
      'washerwoman',
    ])
  })

  it('points a minion at the demon and prompts the Poisoner to poison', () => {
    const imp = makePlayer({ id: 'imp', roleId: 'imp' })
    const poisoner = makePlayer({ id: 'poi', roleId: 'poisoner' })
    const state = makeState({ players: [imp, poisoner] })

    const deck = deckForPlayer(poisoner, state, script, en)
    expect(deck.find((s) => s.id === 'demon')?.tokens).toEqual([
      { kind: 'player', playerId: 'imp' },
    ])
    expect(deck.find((s) => s.id === 'poisoner_choose')?.tokens).toEqual([])
  })

  it('counts the Chef adjacent evil pairs around the circle', () => {
    // Seats: imp(0), poisoner(1), villager(2), chef(3). imp+poisoner adjacent = 1;
    // the wrap chef→imp is good→evil, not a pair.
    const players = [
      makePlayer({ id: 'imp', roleId: 'imp' }),
      makePlayer({ id: 'poi', roleId: 'poisoner' }),
      makePlayer({ id: 'v1', roleId: 'villager' }),
      makePlayer({ id: 'chef', roleId: 'chef' }),
    ]
    const state = makeState({ players })
    const deck = deckForPlayer(players[3], state, script, en)
    expect(deck.find((s) => s.id === 'chef')?.tokens).toEqual([{ kind: 'value', value: '1' }])
  })

  it('counts the empath evil among nearest living neighbors', () => {
    // Seating: empath between a dead poisoner (skipped) and a live imp → 1 evil.
    const empath = makePlayer({ id: 'emp', roleId: 'empath' })
    const deadMinion = addEffectTo(makePlayer({ id: 'poi', roleId: 'poisoner' }), 'dead')
    const imp = makePlayer({ id: 'imp', roleId: 'imp' })
    const chef = makePlayer({ id: 'chef', roleId: 'chef' })
    // Order: chef, empath, deadMinion, imp → left neighbor = chef (good),
    // right nearest-alive = imp (poisoner is dead, skipped).
    const state = makeState({ players: [chef, empath, deadMinion, imp] })

    const deck = deckForPlayer(empath, state, script, en)
    expect(deck[0].tokens).toEqual([{ kind: 'value', value: '1' }])
  })

  it('excludes the Marionette from the demon minions slide and adds its own slide', () => {
    const imp = makePlayer({ id: 'imp', roleId: 'imp' })
    const poisoner = makePlayer({ id: 'poi', roleId: 'poisoner' })
    const marionette = makePlayer({ id: 'mar', roleId: 'marionette' })
    const state = makeState({ players: [imp, poisoner, marionette] })

    const deck = deckForPlayer(imp, state, script, en)
    expect(deck.find((s) => s.id === 'minions')?.tokens).toEqual([
      { kind: 'player', playerId: 'poi' },
    ])
    expect(deck.find((s) => s.id === 'marionette')?.tokens).toEqual([
      { kind: 'player', playerId: 'mar' },
    ])
  })

  it('gives the Marionette no evil-team slides (they think they are good)', () => {
    const imp = makePlayer({ id: 'imp', roleId: 'imp' })
    const marionette = makePlayer({ id: 'mar', roleId: 'marionette' })
    const state = makeState({ players: [imp, marionette] })
    expect(deckForPlayer(marionette, state, script, en)).toEqual([])
  })

  it('computes the Clockmaker demon→nearest-minion distance around the circle', () => {
    // Seats: imp(0), villager(1), villager(2), poisoner(3), clockmaker(4).
    // Circular distance imp→poisoner = min(3, 5-3) = 2.
    const players = [
      makePlayer({ id: 'imp', roleId: 'imp' }),
      makePlayer({ id: 'v1', roleId: 'villager' }),
      makePlayer({ id: 'v2', roleId: 'villager' }),
      makePlayer({ id: 'poi', roleId: 'poisoner' }),
      makePlayer({ id: 'clk', roleId: 'clockmaker' }),
    ]
    const state = makeState({ players })
    const deck = deckForPlayer(players[4], state, script, en)
    expect(deck[0]).toMatchObject({ id: 'clockmaker', tokens: [{ kind: 'value', value: '2' }] })
  })

  it('gives the Washerwoman an empty character slot + two empty player slots', () => {
    const ww = makePlayer({ id: 'ww', roleId: 'washerwoman' })
    const chef = makePlayer({ id: 'chef', roleId: 'chef' })
    const poisoner = makePlayer({ id: 'poi', roleId: 'poisoner' })
    const state = makeState({ players: [ww, chef, poisoner] })

    const deck = deckForPlayer(ww, state, script, en)
    // Storyteller-choice slots start empty — no auto-populated players/characters.
    expect(deck.find((s) => s.id === 'townsfolk_char')?.tokens).toEqual([
      { kind: 'selectRole' },
    ])
    expect(deck.find((s) => s.id === 'townsfolk_players')?.tokens).toEqual([
      { kind: 'selectPlayer' },
      { kind: 'selectPlayer' },
    ])
  })

  it('gives the Knight two empty player slots (never auto-filled)', () => {
    const knight = makePlayer({ id: 'kn', roleId: 'knight' })
    const imp = makePlayer({ id: 'imp', roleId: 'imp' })
    const chef = makePlayer({ id: 'chef', roleId: 'chef' })
    const state = makeState({ players: [knight, imp, chef] })
    expect(deckForPlayer(knight, state, script, en)).toEqual([
      { id: 'knight', message: en.game.infoTokens.deck.knightNotDemon, tokens: [{ kind: 'selectPlayer' }, { kind: 'selectPlayer' }] },
    ])
  })
})
