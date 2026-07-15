import { describe, it, expect, beforeEach } from 'vitest'
import {
  createGame,
  addHistoryEntry,
  startNight,
  startDay,
  getNextStep,
  applyNightAction,
  skipNightAction,
  nominate,
  cancelNomination,
  resolveVote,
  addEffectToPlayer,
  removeEffectFromPlayer,
  getNomineesToday,
  getNominatorsToday,
  getLastNightDeaths,
  setPlayerRole,
  addPlayer,
  removePlayer,
  renamePlayer,
  movePlayer,
  getInPlayRoleIds,
  buildInitialEffects,
} from '../game'
import { getBoardPositions, setBoardPositions } from '../storage'
import { getCurrentState, hasEffect, PlayerState } from '../types'
import {
  makePlayer,
  makeGame,
  makeState,
  makeGameWithHistory,
  makeStandardPlayers,
  addEffectTo,
  resetPlayerCounter,
} from './helpers'

beforeEach(() => {
  resetPlayerCounter()
})

// ============================================================================
// GAME CREATION
// ============================================================================

describe('createGame', () => {
  it('produces a game with correct initial state', () => {
    const game = createGame('Test', 'custom', [
      { name: 'Alice', roleId: 'villager' },
      { name: 'Bob', roleId: 'imp' },
    ])

    expect(game.name).toBe('Test')
    expect(game.history).toHaveLength(1)
    expect(game.history[0].type).toBe('game_created')

    const state = getCurrentState(game)
    expect(state.phase).toBe('setup')
    expect(state.round).toBe(0)
    expect(state.players).toHaveLength(2)
    expect(state.winner).toBeNull()
  })

  it('assigns player IDs and names correctly', () => {
    const game = createGame('Test', 'custom', [
      { name: 'Alice', roleId: 'villager' },
      { name: 'Bob', roleId: 'imp' },
    ])

    const state = getCurrentState(game)
    expect(state.players[0].name).toBe('Alice')
    expect(state.players[0].roleId).toBe('villager')
    expect(state.players[1].name).toBe('Bob')
    expect(state.players[1].roleId).toBe('imp')
  })

  it('applies initialEffects from role definitions', () => {
    const game = createGame('Test', 'custom', [
      { name: 'Alice', roleId: 'soldier' }, // has initialEffect: safe
      { name: 'Bob', roleId: 'virgin' }, // has initialEffect: pure
      { name: 'Carol', roleId: 'villager' }, // no initial effects
    ])

    const state = getCurrentState(game)
    expect(state.players[0].effects.some((e) => e.type === 'safe')).toBe(true)
    expect(state.players[1].effects.some((e) => e.type === 'pure')).toBe(true)
    expect(state.players[2].effects).toHaveLength(0)
  })
})

// ============================================================================
// HISTORY MANAGEMENT
// ============================================================================

describe('addHistoryEntry', () => {
  it('appends an entry with correct stateAfter snapshot', () => {
    const players = makeStandardPlayers()
    const game = makeGame(makeState({ phase: 'night', round: 1, players }))

    const updated = addHistoryEntry(game, {
      type: 'night_action',
      message: [{ type: 'text', content: 'test' }],
      data: { roleId: 'imp', playerId: 'p5', action: 'kill', targetId: 'p1' },
    })

    expect(updated.history).toHaveLength(2)
    const newState = getCurrentState(updated)
    // State unchanged since we didn't pass stateUpdates
    expect(newState.phase).toBe('night')
    expect(newState.round).toBe(1)
  })

  it('applies stateUpdates to the snapshot', () => {
    const players = makeStandardPlayers()
    const game = makeGame(makeState({ phase: 'night', round: 1, players }))

    const updated = addHistoryEntry(
      game,
      {
        type: 'day_started',
        message: [{ type: 'text', content: 'day' }],
        data: {},
      },
      { phase: 'day' },
    )

    const state = getCurrentState(updated)
    expect(state.phase).toBe('day')
  })

  it('applies addEffects to players', () => {
    const players = makeStandardPlayers()
    const game = makeGame(makeState({ phase: 'night', round: 1, players }))

    const updated = addHistoryEntry(
      game,
      {
        type: 'night_action',
        message: [{ type: 'text', content: 'test' }],
        data: {},
      },
      undefined,
      { p1: [{ type: 'safe', expiresAt: 'end_of_night' }] },
    )

    const state = getCurrentState(updated)
    const p1 = state.players.find((p) => p.id === 'p1')!
    expect(hasEffect(p1, 'safe')).toBe(true)
  })

  it('applies removeEffects from players', () => {
    const players = makeStandardPlayers()
    players[0] = addEffectTo(players[0], 'safe')
    const game = makeGame(makeState({ phase: 'night', round: 1, players }))

    const updated = addHistoryEntry(
      game,
      {
        type: 'night_action',
        message: [{ type: 'text', content: 'test' }],
        data: {},
      },
      undefined,
      undefined,
      { p1: ['safe'] },
    )

    const state = getCurrentState(updated)
    const p1 = state.players.find((p) => p.id === 'p1')!
    expect(hasEffect(p1, 'safe')).toBe(false)
  })
})

// ============================================================================
// PHASE TRANSITIONS
// ============================================================================

describe('startNight', () => {
  it('transitions from setup to night round 1', () => {
    const players = makeStandardPlayers()
    const game = makeGame(makeState({ phase: 'setup', round: 0, players }))

    const updated = startNight(game)
    const state = getCurrentState(updated)
    expect(state.phase).toBe('night')
    expect(state.round).toBe(1)
  })

  it('increments round when transitioning from day to night', () => {
    const players = makeStandardPlayers()
    const game = makeGame(makeState({ phase: 'day', round: 1, players }))

    const updated = startNight(game)
    const state = getCurrentState(updated)
    expect(state.phase).toBe('night')
    expect(state.round).toBe(2)
  })
})

describe('startDay', () => {
  it('transitions to day phase', () => {
    const players = makeStandardPlayers()
    const game = makeGame(makeState({ phase: 'night', round: 1, players }))
    // Need a night_started entry for startDay to find
    const withNight = addHistoryEntry(game, {
      type: 'night_started',
      message: [{ type: 'text', content: 'night' }],
      data: { round: 1 },
    })

    const updated = startDay(withNight)
    const state = getCurrentState(updated)
    expect(state.phase).toBe('day')
  })

  it('expires end_of_night effects', () => {
    const players = makeStandardPlayers()
    // p1 has a safe effect that expires at end of night (like Monk protection)
    players[0] = addEffectTo(players[0], 'safe', undefined, 'end_of_night')
    const game = makeGame(makeState({ phase: 'night', round: 1, players }))
    const withNight = addHistoryEntry(game, {
      type: 'night_started',
      message: [{ type: 'text', content: 'night' }],
      data: { round: 1 },
    })

    const updated = startDay(withNight)
    const state = getCurrentState(updated)
    const p1 = state.players.find((p) => p.id === 'p1')!
    expect(hasEffect(p1, 'safe')).toBe(false)
  })

  it('preserves permanent effects', () => {
    const players = makeStandardPlayers()
    // p1 has a permanent safe effect (like Soldier)
    players[0] = addEffectTo(players[0], 'safe', undefined, 'never')
    const game = makeGame(makeState({ phase: 'night', round: 1, players }))
    const withNight = addHistoryEntry(game, {
      type: 'night_started',
      message: [{ type: 'text', content: 'night' }],
      data: { round: 1 },
    })

    const updated = startDay(withNight)
    const state = getCurrentState(updated)
    const p1 = state.players.find((p) => p.id === 'p1')!
    expect(hasEffect(p1, 'safe')).toBe(true)
  })
})

// ============================================================================
// GAME STEP RESOLUTION
// ============================================================================

describe('getNextStep', () => {
  it('returns role_reveal for unrevealed players in setup', () => {
    const players = makeStandardPlayers()
    const game = makeGame(makeState({ phase: 'setup', round: 0, players }))

    const step = getNextStep(game)
    expect(step.type).toBe('role_reveal')
    if (step.type === 'role_reveal') {
      expect(step.playerId).toBe('p1')
    }
  })

  it('returns night_waiting after all roles revealed in setup', () => {
    // Need 3+ players with a demon so win conditions don't trigger
    const players = [
      makePlayer({ id: 'p1', roleId: 'villager' }),
      makePlayer({ id: 'p2', roleId: 'villager' }),
      makePlayer({ id: 'p3', roleId: 'imp' }),
    ]
    let game = makeGame(makeState({ phase: 'setup', round: 0, players }))
    // Mark all players as revealed
    for (const p of players) {
      game = addHistoryEntry(game, {
        type: 'role_revealed',
        message: [{ type: 'text', content: 'revealed' }],
        data: { playerId: p.id, roleId: p.roleId },
      })
    }

    const step = getNextStep(game)
    expect(step.type).toBe('night_waiting')
  })

  it('returns day step during day phase', () => {
    const players = makeStandardPlayers()
    const game = makeGame(makeState({ phase: 'day', round: 1, players }))

    const step = getNextStep(game)
    expect(step.type).toBe('day')
  })
})

// ============================================================================
// NIGHT ACTIONS
// ============================================================================

describe('applyNightAction', () => {
  it('records entries in history', () => {
    const players = makeStandardPlayers()
    const game = makeGame(makeState({ phase: 'night', round: 1, players }))

    const updated = applyNightAction(game, {
      entries: [
        {
          type: 'night_action',
          message: [{ type: 'text', content: 'killed' }],
          data: {
            roleId: 'imp',
            playerId: 'p5',
            action: 'kill',
            targetId: 'p1',
          },
        },
      ],
    })

    expect(updated.history).toHaveLength(2)
    expect(updated.history[1].type).toBe('night_action')
  })

  it('applies direct effect changes', () => {
    const players = makeStandardPlayers()
    const game = makeGame(makeState({ phase: 'night', round: 1, players }))

    const updated = applyNightAction(game, {
      entries: [
        {
          type: 'night_action',
          message: [{ type: 'text', content: 'protected' }],
          data: { roleId: 'monk', playerId: 'p3' },
        },
      ],
      addEffects: {
        p1: [{ type: 'safe', expiresAt: 'end_of_night' }],
      },
    })

    const state = getCurrentState(updated)
    const p1 = state.players.find((p) => p.id === 'p1')!
    expect(hasEffect(p1, 'safe')).toBe(true)
  })
})

describe('skipNightAction', () => {
  it('records a skip entry', () => {
    const players = makeStandardPlayers()
    const game = makeGame(makeState({ phase: 'night', round: 1, players }))

    const updated = skipNightAction(game, 'chef', 'p2')
    expect(updated.history).toHaveLength(2)
    expect(updated.history[1].type).toBe('night_skipped')
    expect(updated.history[1].data.roleId).toBe('chef')
  })
})

// ============================================================================
// NOMINATIONS AND VOTING
// ============================================================================

describe('nominate', () => {
  it('creates a nomination entry and stays in day phase', () => {
    const players = makeStandardPlayers()
    const game = makeGame(makeState({ phase: 'day', round: 1, players }))

    const updated = nominate(game, 'p1', 'p5')
    const state = getCurrentState(updated)
    expect(state.phase).toBe('day')

    // Should have a nomination entry
    const nomEntry = updated.history.find((e) => e.type === 'nomination')
    expect(nomEntry).toBeDefined()
    expect(nomEntry!.data.nominatorId).toBe('p1')
    expect(nomEntry!.data.nomineeId).toBe('p5')
  })

  it('returns unchanged game for invalid player IDs', () => {
    const players = makeStandardPlayers()
    const game = makeGame(makeState({ phase: 'day', round: 1, players }))

    const updated = nominate(game, 'nonexistent', 'p5')
    expect(updated).toBe(game)
  })
})

describe('cancelNomination', () => {
  function makeDayGame(players: PlayerState[]) {
    return makeGameWithHistory(
      [
        { type: 'game_created' },
        { type: 'day_started', stateOverrides: { phase: 'day', round: 1 } },
      ],
      makeState({ phase: 'setup', round: 0, players }),
    )
  }

  it('removes the nomination entry so nominator/nominee are no longer marked', () => {
    const players = makeStandardPlayers()
    const game = makeDayGame(players)

    const nominated = nominate(game, 'p1', 'p5')
    expect(getNominatorsToday(nominated).has('p1')).toBe(true)
    expect(getNomineesToday(nominated).has('p5')).toBe(true)

    const cancelled = cancelNomination(nominated)
    expect(cancelled.history.some((e) => e.type === 'nomination')).toBe(false)
    expect(getNominatorsToday(cancelled).has('p1')).toBe(false)
    expect(getNomineesToday(cancelled).has('p5')).toBe(false)
  })

  it('is a no-op when there is no nomination to cancel', () => {
    const game = makeDayGame(makeStandardPlayers())
    expect(cancelNomination(game)).toBe(game)
  })
})

describe('startDay night death announcement', () => {
  it('announces any player who died during the night (Imp self-kill / redirect, no matching kill entry)', () => {
    const imp = makePlayer({ id: 'imp', roleId: 'imp' })
    const others = Array.from({ length: 4 }, (_, i) =>
      makePlayer({ id: `p${i}`, roleId: 'villager' }),
    )
    // Night 2 in progress, everyone alive at night start.
    const game = makeGameWithHistory(
      [
        { type: 'game_created' },
        { type: 'night_started', stateOverrides: { phase: 'night', round: 2 } },
      ],
      makeState({ phase: 'setup', round: 0, players: [imp, ...others] }),
    )

    // The Imp dies during the night (e.g. self-kill starpass) — logged as
    // "self_kill", not a "kill" with a targetId, so the old scan missed it.
    const afterDeath = addEffectToPlayer(game, 'imp', 'dead')

    const afterDawn = startDay(afterDeath)
    expect(getLastNightDeaths(afterDawn)).toContain('imp')
  })

  it('does not announce a player protected during the night (never gained dead)', () => {
    const imp = makePlayer({ id: 'imp', roleId: 'imp' })
    const monkTarget = makePlayer({ id: 'safe', roleId: 'villager' })
    const others = Array.from({ length: 3 }, (_, i) =>
      makePlayer({ id: `p${i}`, roleId: 'villager' }),
    )
    const game = makeGameWithHistory(
      [
        { type: 'game_created' },
        { type: 'night_started', stateOverrides: { phase: 'night', round: 2 } },
      ],
      makeState({
        phase: 'setup',
        round: 0,
        players: [imp, monkTarget, ...others],
      }),
    )

    // No one gained `dead` — protection held.
    const afterDawn = startDay(game)
    expect(getLastNightDeaths(afterDawn)).toEqual([])
  })
})

describe('resolveVote', () => {
  // Helper: creates a game state in the day phase with a day_started event
  // so getBlockStatus/getNomineesToday can scan history properly
  function makeDayGame(players: PlayerState[]) {
    return makeGameWithHistory(
      [
        { type: 'game_created' },
        { type: 'day_started', stateOverrides: { phase: 'day', round: 1 } },
      ],
      makeState({ phase: 'setup', round: 0, players }),
    )
  }

  it('puts player on block when votes meet threshold (5 alive, 3 needed)', () => {
    const players = makeStandardPlayers() // 5 players
    const game = makeDayGame(players)

    // 3 votes >= ceil(5/2)=3 => meets threshold, goes on block
    const updated = resolveVote(game, 'p5', 3, ['p1', 'p2', 'p3'])
    const state = getCurrentState(updated)
    expect(state.phase).toBe('day')

    // Player is NOT dead yet — execution deferred to end of day
    const p5 = state.players.find((p) => p.id === 'p5')!
    expect(hasEffect(p5, 'dead')).toBe(false)

    // Vote entry should show replacesBlock = true
    const voteEntry = updated.history.find((e) => e.type === 'vote')
    expect(voteEntry?.data.replacesBlock).toBe(true)
    expect(voteEntry?.data.meetsThreshold).toBe(true)
    expect(voteEntry?.data.voteCount).toBe(3)
  })

  it('fails when votes are below threshold', () => {
    const players = makeStandardPlayers() // 5 players
    const game = makeDayGame(players)

    // 2 votes < ceil(5/2)=3 => below threshold
    const updated = resolveVote(game, 'p5', 2, ['p1', 'p2'])
    const state = getCurrentState(updated)
    expect(state.phase).toBe('day')

    const voteEntry = updated.history.find((e) => e.type === 'vote')
    expect(voteEntry?.data.replacesBlock).toBe(false)
    expect(voteEntry?.data.meetsThreshold).toBe(false)
  })

  it('replaces block when new vote is strictly higher', () => {
    const players = makeStandardPlayers()
    const game = makeDayGame(players)

    // First nomination: p5 gets 3 votes (goes on block)
    const afterFirst = resolveVote(game, 'p5', 3, ['p1', 'p2', 'p3'])

    // Second nomination: p4 gets 4 votes (higher, replaces)
    const afterSecond = resolveVote(afterFirst, 'p4', 4, ['p1', 'p2', 'p3', 'p5'])

    const voteEntries = afterSecond.history.filter((e) => e.type === 'vote')
    const lastVote = voteEntries[voteEntries.length - 1]
    expect(lastVote?.data.replacesBlock).toBe(true)
    expect(lastVote?.data.nomineeId).toBe('p4')
  })

  it('clears block on tie (same vote count as current block)', () => {
    const players = makeStandardPlayers()
    const game = makeDayGame(players)

    // First: p5 gets 3 votes (on block)
    const afterFirst = resolveVote(game, 'p5', 3, ['p1', 'p2', 'p3'])

    // Second: p4 gets 3 votes (tie)
    const afterSecond = resolveVote(afterFirst, 'p4', 3, ['p1', 'p2', 'p5'])

    const voteEntries = afterSecond.history.filter((e) => e.type === 'vote')
    // Should have a clearsBlock entry
    const clearEntry = voteEntries.find((e) => e.data.clearsBlock === true)
    expect(clearEntry).toBeDefined()
  })

  it('fails with 0 votes', () => {
    const players = makeStandardPlayers()
    const game = makeDayGame(players)

    const updated = resolveVote(game, 'p5', 0)
    const voteEntry = updated.history.find((e) => e.type === 'vote')
    expect(voteEntry?.data.meetsThreshold).toBe(false)
    expect(voteEntry?.data.replacesBlock).toBe(false)
  })

  it("tracks dead voter's used vote", () => {
    const players = makeStandardPlayers()
    // Kill p1 first
    players[0] = addEffectTo(players[0], 'dead')
    const game = makeDayGame(players)

    // Dead player p1 votes — threshold is ceil(4/2)=2 (only 4 alive)
    const updated = resolveVote(game, 'p5', 3, ['p1', 'p2', 'p3'])
    const state = getCurrentState(updated)

    const p1 = state.players.find((p) => p.id === 'p1')!
    expect(hasEffect(p1, 'used_dead_vote')).toBe(true)
  })

  it("does not track dead voter if they don't vote", () => {
    const players = makeStandardPlayers()
    players[0] = addEffectTo(players[0], 'dead')
    const game = makeDayGame(players)

    // p1 (dead) does NOT vote
    const updated = resolveVote(game, 'p5', 2, ['p2', 'p3'])
    const state = getCurrentState(updated)

    const p1 = state.players.find((p) => p.id === 'p1')!
    expect(hasEffect(p1, 'used_dead_vote')).toBe(false)
  })
})

// ============================================================================
// MANUAL EFFECT MANAGEMENT
// ============================================================================

describe('manual effect management', () => {
  it('addEffectToPlayer adds an effect', () => {
    const players = makeStandardPlayers()
    const game = makeGame(makeState({ phase: 'day', round: 1, players }))

    const updated = addEffectToPlayer(game, 'p1', 'safe')
    const state = getCurrentState(updated)
    const p1 = state.players.find((p) => p.id === 'p1')!
    expect(hasEffect(p1, 'safe')).toBe(true)
  })

  it('removeEffectFromPlayer removes an effect', () => {
    const players = makeStandardPlayers()
    players[0] = addEffectTo(players[0], 'safe')
    const game = makeGame(makeState({ phase: 'day', round: 1, players }))

    const updated = removeEffectFromPlayer(game, 'p1', 'safe')
    const state = getCurrentState(updated)
    const p1 = state.players.find((p) => p.id === 'p1')!
    expect(hasEffect(p1, 'safe')).toBe(false)
  })
})

// ============================================================================
// buildInitialEffects
// ============================================================================

describe('buildInitialEffects', () => {
  it('returns [] for an unassigned role', () => {
    expect(buildInitialEffects('')).toEqual([])
  })

  it('returns [] for an unknown role', () => {
    expect(buildInitialEffects('unknown_role')).toEqual([])
  })

  it('returns the role-declared initial effects for a real role', () => {
    expect(buildInitialEffects('soldier').map((e) => e.type)).toEqual(['safe'])
  })
})

// ============================================================================
// setPlayerRole (Change Character)
// ============================================================================

describe('setPlayerRole', () => {
  it('drops the old role effects, adds the new ones, keeps unrelated effects', () => {
    const game = createGame('T', 'trouble-brewing', [
      { name: 'Alice', roleId: 'soldier' },
      { name: 'Bob', roleId: 'imp' },
    ])
    const soldierId = getCurrentState(game).players[0].id

    // Unrelated effect the swap must preserve.
    const withDead = addEffectToPlayer(game, soldierId, 'dead')
    const reassigned = setPlayerRole(withDead, soldierId, 'virgin')

    const player = getCurrentState(reassigned).players.find(
      (p) => p.id === soldierId,
    )!
    expect(player.roleId).toBe('virgin')
    expect(hasEffect(player, 'safe')).toBe(false) // Soldier's effect stripped
    expect(hasEffect(player, 'pure')).toBe(true) // Virgin's effect added
    expect(hasEffect(player, 'dead')).toBe(true) // unrelated effect untouched
  })

  it('produces the same effect types as a createGame seat (parity)', () => {
    const viaCreate = createGame('T', 'trouble-brewing', [
      { name: 'A', roleId: 'soldier' },
    ])
    const createTypes = getCurrentState(viaCreate)
      .players[0].effects.map((e) => e.type)
      .sort()

    const blank = createGame('T', 'trouble-brewing', [{ name: 'A', roleId: '' }])
    const seatId = getCurrentState(blank).players[0].id
    const assigned = setPlayerRole(blank, seatId, 'soldier')
    const assignedTypes = getCurrentState(assigned)
      .players[0].effects.map((e) => e.type)
      .sort()

    expect(assignedTypes).toEqual(createTypes)
  })

  it('emits a single role_changed history entry', () => {
    const game = createGame('T', 'trouble-brewing', [
      { name: 'A', roleId: '' },
    ])
    const seatId = getCurrentState(game).players[0].id
    const after = setPlayerRole(game, seatId, 'soldier')
    expect(after.history.length).toBe(game.history.length + 1)
    expect(after.history.at(-1)!.type).toBe('role_changed')
  })
})

// ============================================================================
// getInPlayRoleIds
// ============================================================================

describe('getInPlayRoleIds', () => {
  it('falls back to deduped, assigned seat roles when the field is absent', () => {
    const game = createGame('T', 'trouble-brewing', [
      { name: 'A', roleId: 'washerwoman' },
      { name: 'B', roleId: 'chef' },
      { name: 'C', roleId: 'washerwoman' }, // duplicate
      { name: 'D', roleId: '' }, // unassigned — excluded
    ])
    expect(game.inPlayRoleIds).toBeUndefined()
    expect(getInPlayRoleIds(game).sort()).toEqual(['chef', 'washerwoman'])
  })

  it('returns the stored bag verbatim when present', () => {
    const game = createGame(
      'T',
      'trouble-brewing',
      [{ name: 'A', roleId: '' }],
      'simple',
      ['imp', 'washerwoman'],
    )
    expect(getInPlayRoleIds(game)).toEqual(['imp', 'washerwoman'])
  })
})

// ============================================================================
// addPlayer / removePlayer (roster)
// ============================================================================

describe('addPlayer', () => {
  it('appends an unassigned, effect-free seat', () => {
    const game = createGame('T', 'trouble-brewing', [
      { name: 'Alice', roleId: 'imp' },
    ])
    const after = addPlayer(game, 'Bob')
    const players = getCurrentState(after).players
    expect(players).toHaveLength(2)
    expect(players[1].name).toBe('Bob')
    expect(players[1].roleId).toBe('')
    expect(players[1].effects).toEqual([])
    expect(after.history.at(-1)!.type).toBe('player_added')
  })
})

describe('renamePlayer', () => {
  it('changes the seat name and logs a player_renamed entry', () => {
    const game = createGame('T', 'trouble-brewing', [
      { name: 'Player 1', roleId: 'imp' },
    ])
    const id = getCurrentState(game).players[0].id
    const after = renamePlayer(game, id, 'Austin')
    expect(getCurrentState(after).players[0].name).toBe('Austin')
    expect(after.history.at(-1)!.type).toBe('player_renamed')
  })

  it('is a no-op when the name is unchanged', () => {
    const game = createGame('T', 'trouble-brewing', [
      { name: 'Austin', roleId: 'imp' },
    ])
    const id = getCurrentState(game).players[0].id
    expect(renamePlayer(game, id, 'Austin')).toBe(game)
  })
})

describe('removePlayer', () => {
  beforeEach(() => {
    // ponytail: minimal localStorage stub — node test env has no DOM.
    const store = new Map<string, string>()
    globalThis.localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
      key: () => null,
      length: 0,
    } as Storage
  })

  it('drops the player and clears their board position, leaving history intact', () => {
    const game = createGame('T', 'trouble-brewing', [
      { name: 'Alice', roleId: 'villager' },
      { name: 'Bob', roleId: 'imp' },
    ])
    const aliceId = getCurrentState(game).players[0].id
    const bobId = getCurrentState(game).players[1].id

    setBoardPositions(game.id, {
      [aliceId]: { x: 5, y: 5 },
      [bobId]: { x: 1, y: 1 },
    })

    // A history entry that references Alice must survive the removal.
    const withEffect = addEffectToPlayer(game, aliceId, 'dead')
    const priorEntry = withEffect.history.at(-1)!

    const after = removePlayer(withEffect, aliceId)

    // Player gone from current state.
    expect(
      getCurrentState(after).players.find((p) => p.id === aliceId),
    ).toBeUndefined()
    // Their board position cleared; the other player's kept.
    expect(getBoardPositions(game.id)[aliceId]).toBeUndefined()
    expect(getBoardPositions(game.id)[bobId]).toEqual({ x: 1, y: 1 })
    // Pre-existing history entry referencing Alice is present and unchanged.
    expect(after.history.find((e) => e.id === priorEntry.id)).toEqual(priorEntry)
    // The game_created entry still lists Alice.
    const createdPlayers = after.history[0].data.players as { id: string }[]
    expect(createdPlayers.some((p) => p.id === aliceId)).toBe(true)
    expect(after.history.at(-1)!.type).toBe('player_removed')
  })
})

describe('movePlayer', () => {
  const names = (g: ReturnType<typeof createGame>) =>
    getCurrentState(g).players.map((p) => p.name)

  const threeSeat = () =>
    createGame('T', 'trouble-brewing', [
      { name: 'Alice', roleId: 'villager' },
      { name: 'Bob', roleId: 'chef' },
      { name: 'Cara', roleId: 'imp' },
    ])

  it('swaps a seat clockwise with its neighbour', () => {
    const game = threeSeat()
    const aliceId = getCurrentState(game).players[0].id
    const after = movePlayer(game, aliceId, 1)
    expect(names(after)).toEqual(['Bob', 'Alice', 'Cara'])
    expect(after.history.at(-1)!.type).toBe('player_moved')
  })

  it('wraps counter-clockwise from the first seat to the last', () => {
    const game = threeSeat()
    const aliceId = getCurrentState(game).players[0].id
    const after = movePlayer(game, aliceId, -1)
    expect(names(after)).toEqual(['Cara', 'Bob', 'Alice'])
  })

  it('is a no-op for a missing seat', () => {
    const game = threeSeat()
    expect(movePlayer(game, 'nope', 1)).toBe(game)
  })
})
