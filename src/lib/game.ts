import {
  Game,
  GameMode,
  GameState,
  HistoryEntry,
  PlayerState,
  EffectInstance,
  RichMessage,
  generateId,
  getCurrentState,
  hasEffect,
  getAlivePlayers,
} from './types'
import { getRole } from './roles'
import { getScript, getImportedCustoms, type ScriptId } from './scripts'
import { RoleDefinition, NightActionResult, EffectToAdd } from './roles/types'
import {
  resolveIntent,
  applyPipelineChanges,
  checkDynamicWinConditions,
} from './pipeline'
import { NominateIntent, ExecuteIntent } from './pipeline/types'
import { clearBoardPosition } from './storage'
import { trackEvent } from './analytics'
import { UNASSIGNED_ROLE_ID, isUnassigned } from './unassigned'

// Re-exported from a leaf module so components can import the sentinel guard
// without pulling this controller's pipeline/perception graph (see unassigned.ts).
export { UNASSIGNED_ROLE_ID, isUnassigned }

// ============================================================================
// GAME CREATION
// ============================================================================

export type PlayerSetup = {
  name: string
  roleId: string
}

/**
 * The initial effect instances a role grants when assigned. Returns `[]` for an
 * unassigned or unknown role. Single source of truth for `createGame` and
 * `setPlayerRole` so assigned-at-creation and assigned-later seats get identical
 * effects.
 */
export function buildInitialEffects(roleId: string): EffectInstance[] {
  const role = getRole(roleId)
  if (!role?.initialEffects) return []
  return role.initialEffects.map((effect) => ({
    id: generateId(),
    type: effect.type,
    data: effect.data ?? {},
    expiresAt: effect.expiresAt ?? 'never',
  }))
}

export function createGame(
  name: string,
  scriptId: string,
  players: PlayerSetup[],
  mode: GameMode = 'guided',
  inPlayRoleIds?: string[],
): Game {
  const gameId = generateId()

  const playerStates: PlayerState[] = players.map((p) => ({
    id: generateId(),
    name: p.name,
    roleId: p.roleId,
    effects: buildInitialEffects(p.roleId),
  }))

  const initialState: GameState = {
    phase: 'setup',
    round: 0,
    players: playerStates,
    winner: null,
  }

  // Imported scripts live only in the in-session SCRIPTS.imported holder, so
  // snapshot their role list + homebrew characters onto the game to survive a
  // reload. Built-in scripts resolve their roles from the static table.
  const imported = scriptId === 'imported'
  const scriptRoleIds = imported ? [...getScript('imported').roles] : undefined
  const customCharacters = imported ? getImportedCustoms() : undefined

  const game: Game = {
    id: gameId,
    name,
    scriptId,
    mode,
    ...(inPlayRoleIds ? { inPlayRoleIds } : {}),
    ...(scriptRoleIds ? { scriptRoleIds } : {}),
    ...(customCharacters?.length ? { customCharacters } : {}),
    createdAt: Date.now(),
    history: [
      {
        id: generateId(),
        timestamp: Date.now(),
        type: 'game_created',
        message: [{ type: 'i18n', key: 'history.gameStarted' }],
        data: {
          players: playerStates.map((p) => ({
            id: p.id,
            name: p.name,
            roleId: p.roleId,
          })),
        },
        stateAfter: initialState,
      },
    ],
  }

  trackEvent('game_started', {
    player_count: players.length,
    script: scriptId,
  })

  return game
}

/**
 * The in-play character set (the "bag") for the reference panels. Prefers the
 * stored `inPlayRoleIds`; falls back to the deduped, assigned roleIds of the
 * current seats for pre-Simple-Mode saves that predate the field.
 */
export function getInPlayRoleIds(game: Game): string[] {
  if (game.inPlayRoleIds) return game.inPlayRoleIds
  const assigned = getCurrentState(game)
    .players.map((p) => p.roleId)
    .filter((id) => !isUnassigned(id))
  return [...new Set(assigned)]
}

/**
 * The full character list of this game's script. Imported/custom scripts carry
 * a persisted `scriptRoleIds` (survives reload); built-in scripts resolve from
 * the static table. Use this instead of `getScript(scriptId).roles` anywhere
 * the board offers the whole script (pickers, reference panels).
 */
export function getScriptRoleIds(game: Game): string[] {
  return game.scriptRoleIds ?? getScript(game.scriptId as ScriptId).roles
}

// ============================================================================
// HISTORY MANAGEMENT
// ============================================================================

function expireEffects(
  state: GameState,
  expirationType: 'end_of_night' | 'end_of_day',
): GameState {
  return {
    ...state,
    players: state.players.map((player) => ({
      ...player,
      effects: player.effects.filter((e) => e.expiresAt !== expirationType),
    })),
  }
}

export function addHistoryEntry(
  game: Game,
  entry: Omit<HistoryEntry, 'id' | 'timestamp' | 'stateAfter'>,
  stateUpdates?: Partial<GameState>,
  addEffects?: Record<string, EffectToAdd[]>,
  removeEffects?: Record<string, string[]>,
  changeRoles?: Record<string, string>,
): Game {
  const currentState = getCurrentState(game)

  // Apply state updates
  let newState = { ...currentState, ...stateUpdates }

  // Apply effect and role changes
  if (addEffects || removeEffects || changeRoles) {
    newState = {
      ...newState,
      players: newState.players.map((player) => {
        let effects = [...player.effects]
        let roleId = player.roleId

        // Remove effects
        if (removeEffects?.[player.id]) {
          effects = effects.filter(
            (e) => !removeEffects[player.id].includes(e.type),
          )
        }

        // Add effects
        if (addEffects?.[player.id]) {
          const newEffects = addEffects[player.id].map((e) => ({
            id: generateId(),
            type: e.type,
            data: e.data,
            sourcePlayerId: e.sourcePlayerId,
            expiresAt: e.expiresAt,
          }))
          effects = [...effects, ...newEffects]
        }

        // Change role
        if (changeRoles?.[player.id]) {
          roleId = changeRoles[player.id]
        }

        return { ...player, effects, roleId }
      }),
    }
  }

  const historyEntry: HistoryEntry = {
    id: generateId(),
    timestamp: Date.now(),
    type: entry.type,
    message: entry.message,
    data: entry.data,
    stateAfter: newState,
  }

  return {
    ...game,
    history: [...game.history, historyEntry],
  }
}

// ============================================================================
// SETUP ACTIONS
// ============================================================================

import type { SetupActionResult } from './roles/types'

/**
 * Apply a setup action result to the game. Used for pre-revelation setup
 * (e.g., the Drunk choosing which Townsfolk role to believe they are).
 */
export function applySetupAction(
  game: Game,
  playerId: string,
  result: SetupActionResult,
): Game {
  const state = getCurrentState(game)
  const player = state.players.find((p) => p.id === playerId)
  if (!player) return game

  const changeRoles = result.changeRole
    ? { [playerId]: result.changeRole }
    : undefined

  return addHistoryEntry(
    game,
    {
      type: 'setup_action',
      message: [
        {
          type: 'i18n',
          key: 'history.setupAction',
          params: {
            player: playerId,
            role: result.changeRole ?? player.roleId,
          },
        },
      ],
      data: {
        playerId,
        originalRole: player.roleId,
        newRole: result.changeRole,
      },
    },
    undefined,
    result.addEffects,
    result.removeEffects,
    changeRoles,
  )
}

// ============================================================================
// GAME FLOW
// ============================================================================

/**
 * Build a player-centric list of all players with night roles, sorted by nightOrder.
 * When multiple players share the same role, they appear consecutively in player order.
 */
function getPlayersWithNightRoles(
  state: GameState,
): { player: PlayerState; role: RoleDefinition }[] {
  const result: { player: PlayerState; role: RoleDefinition }[] = []

  for (const player of state.players) {
    const role = getRole(player.roleId)
    if (role && role.nightOrder !== null) {
      result.push({ player, role })
    }
  }

  // Sort by nightOrder (stable sort preserves player order for ties)
  result.sort((a, b) => (a.role.nightOrder ?? 0) - (b.role.nightOrder ?? 0))

  return result
}

export type GameStep =
  | { type: 'role_reveal'; playerId: string }
  | { type: 'night_action'; playerId: string; roleId: string }
  | { type: 'night_action_skip'; playerId: string; roleId: string }
  | { type: 'night_waiting' }
  | { type: 'day' }
  | { type: 'game_over'; winner: 'townsfolk' | 'demon' }

export function getNextStep(game: Game): GameStep {
  const state = getCurrentState(game)

  // Check win conditions first
  const winResult = checkWinCondition(state, game)
  if (winResult) {
    return { type: 'game_over', winner: winResult }
  }

  if (state.phase === 'setup') {
    // Find next player who hasn't seen their role
    const revealedPlayers = game.history
      .filter((e) => e.type === 'role_revealed')
      .map((e) => e.data.playerId as string)

    const nextPlayer = state.players.find(
      (p) => !revealedPlayers.includes(p.id),
    )

    if (nextPlayer) {
      return { type: 'role_reveal', playerId: nextPlayer.id }
    }

    return { type: 'night_waiting' }
  }

  if (state.phase === 'night') {
    // Find which players have acted this night (tracked by playerId)
    const nightStartIndex = findLastEventIndex(game, 'night_started')
    const actedPlayerIds = new Set(
      game.history
        .slice(nightStartIndex + 1)
        .filter((e) => e.type === 'night_action' || e.type === 'night_skipped')
        .map((e) => e.data.playerId as string),
    )

    // Build a player-centric list sorted by nightOrder
    const playersWithNightRoles = getPlayersWithNightRoles(state)

    // Find next player that hasn't acted
    for (const { player, role } of playersWithNightRoles) {
      if (!actedPlayerIds.has(player.id)) {
        if (role.shouldWake && !role.shouldWake(game, player)) {
          return {
            type: 'night_action_skip',
            playerId: player.id,
            roleId: role.id,
          }
        }
        return {
          type: 'night_action',
          playerId: player.id,
          roleId: role.id,
        }
      }
    }

    return { type: 'night_waiting' }
  }

  if (state.phase === 'day') {
    return { type: 'day' }
  }

  return { type: 'day' }
}

function findLastEventIndex(game: Game, eventType: string): number {
  for (let i = game.history.length - 1; i >= 0; i--) {
    if (game.history[i].type === eventType) {
      return i
    }
  }
  return -1
}


// ============================================================================
// PHASE TRANSITIONS
// ============================================================================

export function startNight(game: Game): Game {
  const state = getCurrentState(game)
  const newRound = state.phase === 'setup' ? 1 : state.round + 1

  // Expire effects that should end at end of day (e.g., Poisoner's poison)
  const stateAfterExpiration = expireEffects(state, 'end_of_day')

  return addHistoryEntry(
    game,
    {
      type: 'night_started',
      message: [
        {
          type: 'i18n',
          key: 'history.nightBegins',
          params: { round: newRound },
        },
      ],
      data: { round: newRound },
    },
    {
      phase: 'night',
      round: newRound,
      players: stateAfterExpiration.players,
    },
  )
}

export function startDay(game: Game): Game {
  // Resolve night - add death announcement entries
  let updatedGame = addHistoryEntry(game, {
    type: 'night_resolved',
    message: [{ type: 'i18n', key: 'history.sunRises' }],
    data: {},
  })

  // Announce everyone who newly died during the night. Deriving deaths from the
  // dead-effect diff (rather than scanning the killer's kill entry) is fully
  // generic: it covers the Imp's self-kill starpass (logged as "self_kill", not
  // "kill") and Deflect-redirected kills, whose victim differs from the original
  // target. Both previously slipped through as "nobody died".
  const nightStartIndex = findLastEventIndex(updatedGame, 'night_started')
  const aliveAtNightStart = new Set(
    nightStartIndex === -1
      ? []
      : updatedGame.history[nightStartIndex].stateAfter.players
          .filter((p) => !hasEffect(p, 'dead'))
          .map((p) => p.id),
  )

  const currentState = getCurrentState(updatedGame)
  const nightDeaths = currentState.players.filter(
    (p) => aliveAtNightStart.has(p.id) && hasEffect(p, 'dead'),
  )

  for (const player of nightDeaths) {
    updatedGame = addHistoryEntry(updatedGame, {
      type: 'effect_added',
      message: [
        {
          type: 'i18n',
          key: 'history.diedInNight',
          params: { player: player.id },
        },
      ],
      data: { playerId: player.id, effectType: 'dead' },
    })
  }

  // Expire effects that should end at end of night (e.g., Monk's protection)
  const stateAfterExpiration = expireEffects(
    getCurrentState(updatedGame),
    'end_of_night',
  )

  // Transition to day with expired effects applied
  return addHistoryEntry(
    updatedGame,
    {
      type: 'day_started',
      message: [
        {
          type: 'i18n',
          key: 'history.dayBegins',
          params: { round: currentState.round },
        },
      ],
      data: { round: currentState.round },
    },
    { phase: 'day', players: stateAfterExpiration.players },
  )
}

export function markRoleRevealed(game: Game, playerId: string): Game {
  const state = getCurrentState(game)
  const player = state.players.find((p) => p.id === playerId)
  if (!player) return game

  return addHistoryEntry(game, {
    type: 'role_revealed',
    message: [
      {
        type: 'i18n',
        key: 'history.learnedRole',
        params: { player: playerId, role: player.roleId },
      },
    ],
    data: { playerId, roleId: player.roleId },
  })
}

// markRoleChangeRevealed is no longer needed here — role change reveals
// are now handled as night follow-ups via the pending_role_reveal effect.
// The follow-up's ActionComponent creates the role_change_revealed entry.

export function applyNightAction(game: Game, result: NightActionResult): Game {
  let updatedGame = game

  // Apply direct entries and effects (not the intent — that's handled by the pipeline)
  const directEntries = result.entries
  const directResult = {
    entries: directEntries,
    stateUpdates: result.stateUpdates,
    addEffects: result.addEffects,
    removeEffects: result.removeEffects,
    changeRoles: result.changeRoles,
  }

  for (const entry of directResult.entries) {
    updatedGame = addHistoryEntry(
      updatedGame,
      entry,
      directResult.stateUpdates,
      directResult.addEffects,
      directResult.removeEffects,
      directResult.changeRoles,
    )
    // Only apply state/effects/roles on first entry
    directResult.stateUpdates = undefined
    directResult.addEffects = undefined
    directResult.removeEffects = undefined
    directResult.changeRoles = undefined
  }

  return updatedGame
}

export function skipNightAction(
  game: Game,
  roleId: string,
  playerId: string,
): Game {
  return addHistoryEntry(game, {
    type: 'night_skipped',
    message: [
      {
        type: 'i18n',
        key: 'history.noActionTonight',
        params: { role: roleId },
      },
    ],
    data: { roleId, playerId },
  })
}

// ============================================================================
// NOMINATIONS — Resolved through the pipeline
// ============================================================================

/**
 * Nominate a player for execution.
 * The nomination goes through the pipeline, which handles effect interactions
 * like the Virgin's Pure effect.
 */
export function nominate(
  game: Game,
  nominatorId: string,
  nomineeId: string,
): Game {
  const state = getCurrentState(game)
  const nominator = state.players.find((p) => p.id === nominatorId)
  const nominee = state.players.find((p) => p.id === nomineeId)

  if (!nominator || !nominee) return game

  const intent: NominateIntent = {
    type: 'nominate',
    nominatorId,
    nomineeId,
  }

  const result = resolveIntent(intent, state, game)

  // Nominations never require UI input, so result is always resolved or prevented
  if (result.type === 'needs_input') {
    // This shouldn't happen, but handle gracefully
    return game
  }

  return applyPipelineChanges(game, result.stateChanges)
}

/**
 * Cancel the most recent nomination, removing it (and anything recorded after
 * it) from history. Without this, backing out of the voting screen leaves the
 * nominator and nominee marked as having nominated / been nominated for the day.
 */
export function cancelNomination(game: Game): Game {
  for (let i = game.history.length - 1; i >= 0; i--) {
    if (game.history[i].type === 'nomination') {
      return { ...game, history: game.history.slice(0, i) }
    }
  }
  return game
}

// ============================================================================
// VOTING — Official BotC rules: binary voting, threshold, deferred execution
// ============================================================================

/**
 * The status of "the block" — the player currently nominated for execution.
 * In the official rules, the player with the most votes (above threshold)
 * is "on the block" and will be executed at end of day.
 */
export type BlockStatus = {
  playerId: string
  playerName: string
  voteCount: number
} | null

/**
 * Get who is currently "on the block" — the player with the highest
 * vote count that met the threshold today. Returns null if nobody qualified.
 * Scans vote entries since the last day_started.
 */
export function getBlockStatus(game: Game): BlockStatus {
  const dayStartIndex = findLastEventIndex(game, 'day_started')
  if (dayStartIndex === -1) return null

  let block: BlockStatus = null

  for (let i = dayStartIndex + 1; i < game.history.length; i++) {
    const entry = game.history[i]
    if (entry.type === 'vote' && entry.data.replacesBlock === true) {
      block = {
        playerId: entry.data.nomineeId as string,
        playerName: entry.data.nomineeName as string,
        voteCount: entry.data.voteCount as number,
      }
    }
  }

  return block
}

/**
 * Get the set of player IDs who have been nominated today.
 */
export function getNomineesToday(game: Game): Set<string> {
  const dayStartIndex = findLastEventIndex(game, 'day_started')
  if (dayStartIndex === -1) return new Set()
  const ids = new Set<string>()
  for (let i = dayStartIndex + 1; i < game.history.length; i++) {
    if (game.history[i].type === 'nomination') {
      ids.add(game.history[i].data.nomineeId as string)
    }
  }
  return ids
}

/**
 * Check if a virgin execution happened today (nominations should be blocked).
 */
export function hasVirginExecutionToday(game: Game): boolean {
  const dayStartIndex = findLastEventIndex(game, 'day_started')
  if (dayStartIndex === -1) return false
  for (let i = dayStartIndex + 1; i < game.history.length; i++) {
    if (game.history[i].type === 'virgin_execution') {
      return true
    }
  }
  return false
}

/**
 * Get the vote threshold: the minimum number of votes needed to go on the block.
 * This is at least half the alive players (rounded up).
 */
export function getVoteThreshold(state: GameState): number {
  return Math.ceil(getAlivePlayers(state).length / 2)
}

/**
 * Resolve a vote on a nominated player.
 *
 * Official BotC rules:
 * - Voting is binary: you vote (raise hand) or don't
 * - Threshold: votes >= ceil(aliveCount / 2) to meet the minimum
 * - If the vote meets threshold AND is strictly higher than the current block,
 *   the nominee replaces whoever was on the block
 * - If it ties with the current block, nobody is on the block (tie = no execution)
 * - Execution is deferred to end of day via executeAtEndOfDay()
 */
export function resolveVote(
  game: Game,
  nomineeId: string,
  voteCount: number,
  votedIds?: string[],
): Game {
  const state = getCurrentState(game)
  const nominee = state.players.find((p) => p.id === nomineeId)
  if (!nominee) return game

  const threshold = getVoteThreshold(state)
  const meetsThreshold = voteCount >= threshold
  const currentBlock = getBlockStatus(game)

  // Determine if this vote replaces the current block
  let replacesBlock = false
  let clearsBlock = false

  if (meetsThreshold) {
    if (!currentBlock) {
      // No one on the block — this player takes it
      replacesBlock = true
    } else if (voteCount > currentBlock.voteCount) {
      // Strictly more votes — replaces the block
      replacesBlock = true
    } else if (voteCount === currentBlock.voteCount) {
      // Tie — clears the block (nobody executed)
      clearsBlock = true
    }
    // If fewer votes than current block, nothing changes
  }

  // Mark dead voters as having used their vote (only when detailed IDs available)
  const addEffects: Record<string, { type: string }[]> = {}
  if (votedIds) {
    for (const voterId of votedIds) {
      const voter = state.players.find((p) => p.id === voterId)
      if (
        voter &&
        hasEffect(voter, 'dead') &&
        !hasEffect(voter, 'used_dead_vote')
      ) {
        addEffects[voterId] = [{ type: 'used_dead_vote' }]
      }
    }
  }

  // Build history message
  const messageKey = replacesBlock
    ? 'history.votePassed'
    : 'history.voteFailed'

  const updatedGame = addHistoryEntry(
    game,
    {
      type: 'vote',
      message: [
        {
          type: 'i18n',
          key: 'history.voteResult',
          params: {
            player: nomineeId,
            votes: voteCount,
            threshold,
          },
        },
        {
          type: 'i18n',
          key: messageKey,
          params: { player: nomineeId },
        },
      ],
      data: {
        nomineeId,
        nomineeName: nominee.name,
        votedIds: votedIds ?? [],
        voteCount,
        threshold,
        meetsThreshold,
        replacesBlock,
        clearsBlock,
      },
    },
    { phase: 'day' },
    addEffects,
  )

  // If there's a tie, record a separate entry clearing the block
  if (clearsBlock) {
    return addHistoryEntry(
      updatedGame,
      {
        type: 'vote',
        message: [
          {
            type: 'i18n',
            key: 'history.voteTied',
            params: { player: nomineeId },
          },
        ],
        data: {
          nomineeId,
          nomineeName: nominee.name,
          voteCount,
          threshold,
          meetsThreshold: true,
          replacesBlock: false,
          clearsBlock: true,
          // A tie clear means we need to reset the block.
          // We track this by marking no entry as replacesBlock after this point.
        },
      },
    )
  }

  return updatedGame
}

/**
 * Execute whoever is on the block at end of day.
 * Called when the narrator ends the day. Routes through the intent pipeline
 * so effects (Scarlet Woman, Saint, etc.) can intercept.
 * Returns the game unchanged if nobody is on the block.
 */
export function executeAtEndOfDay(game: Game): Game {
  const block = getBlockStatus(game)
  if (!block) return game

  // Check for a tie-clear that happened after the block was set
  const dayStartIndex = findLastEventIndex(game, 'day_started')
  for (let i = game.history.length - 1; i > dayStartIndex; i--) {
    const entry = game.history[i]
    if (entry.type === 'vote' && entry.data.clearsBlock === true) {
      // The most recent clear is after the most recent block replacement
      // Check if any replacesBlock entry comes after this clear
      let hasBlockAfterClear = false
      for (let j = i + 1; j < game.history.length; j++) {
        if (
          game.history[j].type === 'vote' &&
          game.history[j].data.replacesBlock === true
        ) {
          hasBlockAfterClear = true
          break
        }
      }
      if (!hasBlockAfterClear) {
        return game // Block was cleared by a tie, no execution
      }
    }
  }

  const executeIntent: ExecuteIntent = {
    type: 'execute',
    playerId: block.playerId,
    cause: 'execution',
  }

  const result = resolveIntent(
    executeIntent,
    getCurrentState(game),
    game,
  )

  // Executions don't require UI input, so result is always resolved or prevented
  if (result.type === 'needs_input') {
    return game
  }

  return applyPipelineChanges(game, result.stateChanges)
}

// ============================================================================
// WIN CONDITIONS — Dynamic, effect/role-driven
// ============================================================================

/**
 * Core win condition check: demons dead or 2 alive.
 * Plus dynamic win conditions from effects and roles.
 */
export function checkWinCondition(
  state: GameState,
  game?: Game,
): 'townsfolk' | 'demon' | null {
  const alivePlayers = getAlivePlayers(state)
  const aliveDemons = alivePlayers.filter((p) => {
    const role = getRole(p.roleId)
    return role?.team === 'demon'
  })

  // Good wins if all demons are dead
  if (aliveDemons.length === 0) {
    return 'townsfolk'
  }

  // Evil wins if only 2 players remain (and one is a demon)
  if (alivePlayers.length <= 2 && aliveDemons.length > 0) {
    return 'demon'
  }

  // Check dynamic win conditions from effects and roles
  if (game) {
    const dynamicResult = checkDynamicWinConditions(
      state,
      game,
      ['after_execution', 'after_state_change'],
      getRole,
    )
    if (dynamicResult) return dynamicResult
  }

  return null
}

/**
 * Check end-of-day specific win conditions (e.g., Mayor's peaceful victory).
 * Called when the narrator ends the day.
 */
export function checkEndOfDayWinConditions(
  state: GameState,
  game: Game,
): 'townsfolk' | 'demon' | null {
  return checkDynamicWinConditions(state, game, ['end_of_day'], getRole)
}

export function endGame(game: Game, winner: 'townsfolk' | 'demon'): Game {
  const state = getCurrentState(game)
  trackEvent('game_finished', {
    winner,
    player_count: state.players.length,
    round_count: state.round,
    script: game.scriptId,
  })

  return addHistoryEntry(
    game,
    {
      type: 'game_ended',
      message: [
        {
          type: 'i18n',
          key: winner === 'townsfolk' ? 'history.goodWins' : 'history.evilWins',
        },
      ],
      data: { winner },
    },
    { phase: 'ended', winner },
  )
}

// ============================================================================
// QUERY HELPERS
// ============================================================================

/**
 * Get the player IDs of players who died during the last night.
 * Scans history from the last night_resolved to day_started for death entries.
 */
export function getLastNightDeaths(game: Game): string[] {
  const nightResolvedIndex = findLastEventIndex(game, 'night_resolved')
  if (nightResolvedIndex === -1) return []

  const deaths: string[] = []
  for (let i = nightResolvedIndex + 1; i < game.history.length; i++) {
    const entry = game.history[i]
    if (entry.type === 'day_started') break
    if (
      entry.type === 'effect_added' &&
      entry.data.effectType === 'dead' &&
      entry.data.source !== 'narrator'
    ) {
      deaths.push(entry.data.playerId as string)
    }
  }
  return deaths
}

/**
 * Get the set of player IDs who have nominated today.
 */
export function getNominatorsToday(game: Game): Set<string> {
  const dayStartIndex = findLastEventIndex(game, 'day_started')
  if (dayStartIndex === -1) return new Set()
  const ids = new Set<string>()
  for (let i = dayStartIndex + 1; i < game.history.length; i++) {
    if (game.history[i].type === 'nomination') {
      ids.add(game.history[i].data.nominatorId as string)
    }
  }
  return ids
}

/**
 * Get history messages for a player's night action this night.
 * Used for reviewing completed actions in the Night Dashboard.
 */
export function getNightActionSummary(
  game: Game,
  playerId: string,
): RichMessage[] {
  const nightStartIndex = findLastEventIndex(game, 'night_started')
  if (nightStartIndex === -1) return []

  const messages: RichMessage[] = []
  for (let i = nightStartIndex + 1; i < game.history.length; i++) {
    const entry = game.history[i]
    if (entry.type === 'night_action' && entry.data.playerId === playerId) {
      messages.push(entry.message)
    }
  }
  return messages
}

// ============================================================================
// NIGHT DASHBOARD HELPERS
// ============================================================================

export type NightRoleStatus = {
  roleId: string
  playerId: string
  playerName: string
  status: 'pending' | 'done'
}

/**
 * Get the status of night roles that actually need to wake this night.
 * Roles that were auto-skipped (shouldWake returned false) are excluded.
 * Returns roles in night order with their current status.
 *
 * Note: reactive follow-ups (like role change reveals) are NOT included here.
 * Those are collected separately via getAvailableNightFollowUps() in the
 * pipeline module and merged by the NightDashboard UI.
 */
export function getNightRolesStatus(game: Game): NightRoleStatus[] {
  const state = getCurrentState(game)

  const nightStartIndex = findLastEventIndex(game, 'night_started')
  const actedEntries = game.history
    .slice(nightStartIndex + 1)
    .filter((e) => e.type === 'night_action' || e.type === 'night_skipped')

  // Track acted players by playerId
  const actedPlayerIds = new Map<string, 'night_action' | 'night_skipped'>()
  for (const entry of actedEntries) {
    actedPlayerIds.set(
      entry.data.playerId as string,
      entry.type as 'night_action' | 'night_skipped',
    )
  }

  // Build a player-centric list sorted by nightOrder
  const playersWithNightRoles = getPlayersWithNightRoles(state)

  const result: NightRoleStatus[] = []

  for (const { player, role } of playersWithNightRoles) {
    const actedType = actedPlayerIds.get(player.id)

    if (actedType) {
      // Already processed — only include if it actually acted (not skipped)
      if (actedType === 'night_action') {
        result.push({
          roleId: role.id,
          playerId: player.id,
          playerName: player.name,
          status: 'done',
        })
      }
      // night_skipped entries are simply not included
    } else {
      // Not yet processed — only include if shouldWake passes
      const shouldWake = !role.shouldWake || role.shouldWake(game, player)
      if (shouldWake) {
        result.push({
          roleId: role.id,
          playerId: player.id,
          playerName: player.name,
          status: 'pending',
        })
      }
    }
  }

  return result
}

/**
 * Process all auto-skippable night actions from the current position.
 * Returns the updated game with skipped entries applied.
 * Stops when it hits a role that needs manual action or all are done.
 */
export function processAutoSkips(game: Game): Game {
  let updatedGame = game
  while (true) {
    const step = getNextStep(updatedGame)
    if (step.type === 'night_action_skip') {
      updatedGame = skipNightAction(updatedGame, step.roleId, step.playerId)
    } else {
      break
    }
  }
  return updatedGame
}

// ============================================================================
// MANUAL EFFECT MANAGEMENT
// ============================================================================

/**
 * Manually add an effect to a player (narrator action)
 */
export function addEffectToPlayer(
  game: Game,
  playerId: string,
  effectType: string,
  data?: Record<string, unknown>,
): Game {
  return addHistoryEntry(
    game,
    {
      type: 'effect_added',
      message: [
        {
          type: 'i18n',
          key: 'history.effectAdded',
          params: { player: playerId, effect: effectType },
        },
      ],
      data: { playerId, effectType, source: 'narrator' },
    },
    undefined,
    { [playerId]: [{ type: effectType, data, expiresAt: 'never' }] },
  )
}

/**
 * Reassign a seat's character (narrator board action — Change Character). Strips
 * the effects the OLD role granted at assignment, applies the NEW role's initial
 * effects, changes the roleId, and leaves everything else (dead, poisoned,
 * reminders, manually-added effects) untouched. Mirrors how `createGame` applies
 * `buildInitialEffects`, so a seat set here has effect parity with one dealt at
 * creation. Emits one `role_changed` history entry.
 *
 * ponytail: old effects are stripped by *type*. If a role's initial-effect type
 * were also granted to the seat by another source, that instance would be dropped
 * too — no current BOTC role shares an initial-effect type across sources, so this
 * is safe; revisit (strip by instance id) if one ever does.
 */
export function setPlayerRole(
  game: Game,
  playerId: string,
  roleId: string,
): Game {
  const player = getCurrentState(game).players.find((p) => p.id === playerId)
  if (!player) return game

  const oldEffectTypes = buildInitialEffects(player.roleId).map((e) => e.type)
  const newEffects = buildInitialEffects(roleId)

  return addHistoryEntry(
    game,
    {
      type: 'role_changed',
      message: [
        {
          type: 'i18n',
          key: 'history.roleChanged',
          params: { player: playerId, role: roleId },
        },
      ],
      data: { playerId, roleId, previousRoleId: player.roleId, source: 'narrator' },
    },
    undefined,
    { [playerId]: newEffects },
    { [playerId]: oldEffectTypes },
    { [playerId]: roleId },
  )
}

/**
 * Append a new unassigned seat (narrator board action). The seat starts with no
 * character (`UNASSIGNED_ROLE_ID`) and no effects; the storyteller assigns it via
 * Change Character. Emits one `player_added` history entry.
 */
export function addPlayer(game: Game, name: string): Game {
  const state = getCurrentState(game)
  const newPlayer: PlayerState = {
    id: generateId(),
    name,
    roleId: UNASSIGNED_ROLE_ID,
    effects: [],
  }

  return addHistoryEntry(
    game,
    {
      type: 'player_added',
      message: [{ type: 'i18n', key: 'history.playerAdded', params: { name } }],
      data: { playerId: newPlayer.id, name, source: 'narrator' },
    },
    { players: [...state.players, newPlayer] },
  )
}

/**
 * Rename a seat (narrator board action). Cosmetic label only — no role/effect
 * change. No-op if the seat is missing or the name is unchanged.
 */
export function renamePlayer(game: Game, playerId: string, name: string): Game {
  const state = getCurrentState(game)
  const player = state.players.find((p) => p.id === playerId)
  if (!player || player.name === name) return game

  return addHistoryEntry(
    game,
    {
      type: 'player_renamed',
      message: [{ type: 'i18n', key: 'history.playerRenamed', params: { name } }],
      data: { playerId, name, previousName: player.name, source: 'narrator' },
    },
    { players: state.players.map((p) => (p.id === playerId ? { ...p, name } : p)) },
  )
}

/**
 * Remove a seat (narrator board action). Drops the player from state (which drops
 * their own effects) and clears their persisted board position. Past history
 * entries referencing them are left intact — the event log is append-only, so
 * their name still appears in prior events. Emits one `player_removed` entry.
 */
export function removePlayer(game: Game, playerId: string): Game {
  const state = getCurrentState(game)
  const player = state.players.find((p) => p.id === playerId)
  if (!player) return game

  clearBoardPosition(game.id, playerId)

  return addHistoryEntry(
    game,
    {
      type: 'player_removed',
      message: [
        { type: 'i18n', key: 'history.playerRemoved', params: { name: player.name } },
      ],
      data: { playerId, name: player.name, source: 'narrator' },
    },
    { players: state.players.filter((p) => p.id !== playerId) },
  )
}

/**
 * Shift a seat one place around the table (narrator board action). `dir` +1 moves
 * the player clockwise (toward the next seat), -1 counter-clockwise; both wrap
 * around the circle. Implemented as a swap with the neighbour, so repeated calls
 * walk the player around the table. Emits one `player_moved` entry. No-op for a
 * missing seat or a table of fewer than two players.
 *
 * Cosmetic board offsets are keyed by player id and left untouched here; the
 * board clears the swapped seats' offsets so they snap into their new places.
 */
export function movePlayer(game: Game, playerId: string, dir: 1 | -1): Game {
  const state = getCurrentState(game)
  const players = state.players
  const i = players.findIndex((p) => p.id === playerId)
  if (i === -1 || players.length < 2) return game

  const j = (i + dir + players.length) % players.length
  const reordered = [...players]
  ;[reordered[i], reordered[j]] = [reordered[j], reordered[i]]

  return addHistoryEntry(
    game,
    {
      type: 'player_moved',
      message: [
        { type: 'i18n', key: 'history.playerMoved', params: { name: players[i].name } },
      ],
      data: { playerId, dir, swappedWith: players[j].id, source: 'narrator' },
    },
    { players: reordered },
  )
}

/**
 * Manually update the data of an existing effect instance on a player (narrator action).
 * Finds the first effect of the given type and replaces its data.
 */
export function updateEffectData(
  game: Game,
  playerId: string,
  effectType: string,
  data: Record<string, unknown>,
): Game {
  const currentState = getCurrentState(game)
  const player = currentState.players.find((p) => p.id === playerId)
  if (!player) return game

  const hasTargetEffect = player.effects.some((e) => e.type === effectType)
  if (!hasTargetEffect) return game

  // Update the first matching effect instance's data
  const updatedPlayers = currentState.players.map((p) => {
    if (p.id !== playerId) return p
    let found = false
    return {
      ...p,
      effects: p.effects.map((e) => {
        if (!found && e.type === effectType) {
          found = true
          return { ...e, data: { ...e.data, ...data } }
        }
        return e
      }),
    }
  })

  const historyEntry: Omit<HistoryEntry, 'id' | 'timestamp' | 'stateAfter'> = {
    type: 'effect_added',
    message: [
      {
        type: 'i18n',
        key: 'history.effectUpdated',
        params: { player: playerId, effect: effectType },
      },
    ],
    data: { playerId, effectType, source: 'narrator', action: 'update' },
  }

  return addHistoryEntry(game, historyEntry, { players: updatedPlayers })
}

/**
 * Manually remove an effect from a player (narrator action)
 */
export function removeEffectFromPlayer(
  game: Game,
  playerId: string,
  effectType: string,
): Game {
  return addHistoryEntry(
    game,
    {
      type: 'effect_removed',
      message: [
        {
          type: 'i18n',
          key: 'history.effectRemoved',
          params: { player: playerId, effect: effectType },
        },
      ],
      data: { playerId, effectType, source: 'narrator' },
    },
    undefined,
    undefined,
    { [playerId]: [effectType] },
  )
}

/**
 * Remove a single effect instance by its id (narrator action). Unlike
 * `removeEffectFromPlayer` (which removes every effect of a type), this targets
 * one instance — needed for reminder markers, which all share type `reminder`.
 */
export function removeEffectInstance(
  game: Game,
  playerId: string,
  instanceId: string,
): Game {
  const state = getCurrentState(game)
  const player = state.players.find((p) => p.id === playerId)
  const inst = player?.effects.find((e) => e.id === instanceId)
  if (!inst) return game

  const players = state.players.map((p) =>
    p.id === playerId
      ? { ...p, effects: p.effects.filter((e) => e.id !== instanceId) }
      : p,
  )

  return addHistoryEntry(
    game,
    {
      type: 'effect_removed',
      message: [
        {
          type: 'i18n',
          key: 'history.effectRemoved',
          params: { player: playerId, effect: inst.type },
        },
      ],
      data: { playerId, effectType: inst.type, instanceId, source: 'narrator' },
    },
    { players },
  )
}

/**
 * Move a single effect instance from one player to another, atomically and in
 * one history entry (narrator board action). Instance-precise so moving one
 * reminder marker doesn't disturb the player's other markers, and atomic so the
 * remove and add can't clobber each other via a stale snapshot.
 */
export function moveEffectInstance(
  game: Game,
  fromId: string,
  toId: string,
  instanceId: string,
): Game {
  const state = getCurrentState(game)
  const from = state.players.find((p) => p.id === fromId)
  const inst = from?.effects.find((e) => e.id === instanceId)
  if (!inst) return game

  const players = state.players.map((p) => {
    if (p.id === fromId) {
      return { ...p, effects: p.effects.filter((e) => e.id !== instanceId) }
    }
    if (p.id === toId) {
      return { ...p, effects: [...p.effects, { ...inst, id: generateId() }] }
    }
    return p
  })

  return addHistoryEntry(
    game,
    {
      type: 'effect_added',
      message: [
        {
          type: 'i18n',
          key: 'history.effectAdded',
          params: { player: toId, effect: inst.type },
        },
      ],
      data: { fromId, toId, effectType: inst.type, source: 'narrator', action: 'move' },
    },
    { players },
  )
}
