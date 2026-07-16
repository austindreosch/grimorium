import { GameState, PlayerState, isAlive } from '../types'
import { getRole } from '../roles'
import { isEvilTeam, TeamId } from '../teams'
import { Translations } from '../i18n/types'

/**
 * A single info-token slide the storyteller flashes to a player. Tokens render
 * above the gilded message: a character token, a player-name disc, or a big
 * computed value (e.g. the Empath count).
 */
export type DeckToken =
  | { kind: 'role'; roleId: string }
  | { kind: 'player'; playerId: string }
  | { kind: 'value'; value: string }
  // Empty storyteller-choice slots — render blank until tapped and filled on the
  // reveal. `selectRole` = pick a character, `selectPlayer` = pick a player.
  | { kind: 'selectRole' }
  | { kind: 'selectPlayer' }

export type DeckSlide = {
  id: string
  message: string
  tokens: DeckToken[]
}

const teamOf = (roleId: string): TeamId | undefined => getRole(roleId)?.team
const isEvilRole = (roleId: string) => isEvilTeam(teamOf(roleId) ?? 'townsfolk')

/**
 * Build the ordered deck of info-token slides a seat needs, pre-filled from the
 * current board.
 *
 * Two fill modes: fully computed where the board determines the answer (your
 * minions, the demon, the Empath/Clockmaker counts, not-in-play bluffs), and a
 * rules-valid *default* where the real value is a storyteller choice the manual
 * board never recorded (Washerwoman/Librarian/Investigator picks, Grandmother's
 * grandchild, the Knight's two players). Those defaults are placeholders the
 * narrator adjusts on the reveal — the swap interaction is still TODO.
 *
 * ponytail: reads raw team alignment, not perceive() — Recluse/Spy
 * misregistration isn't applied yet. Swap to perceive() when those land.
 */
export function deckForPlayer(
  player: PlayerState,
  state: GameState,
  scriptRoleIds: string[],
  t: Translations,
): DeckSlide[] {
  const D = t.game.infoTokens.deck
  const team = teamOf(player.roleId)
  const slides: DeckSlide[] = []
  const ps = state.players

  // ── Evil: shared team info ────────────────────────────────────────────────
  if (team === 'demon') {
    // The Marionette is a hidden minion — shown to the demon separately, never
    // listed among the normal minions.
    const minions = ps.filter(
      (p) => teamOf(p.roleId) === 'minion' && p.roleId !== 'marionette',
    )
    if (minions.length) {
      slides.push({
        id: 'minions',
        message: D.minions,
        tokens: minions.map((p) => ({ kind: 'player', playerId: p.id })),
      })
    }
    const inPlay = new Set(ps.map((p) => p.roleId))
    const bluffs = scriptRoleIds
      .filter((r) => !inPlay.has(r) && !isEvilRole(r))
      .slice(0, 3)
    if (bluffs.length) {
      slides.push({
        id: 'bluffs',
        message: D.bluffs,
        tokens: bluffs.map((r) => ({ kind: 'role', roleId: r })),
      })
    }
    const marionette = ps.find((p) => p.roleId === 'marionette')
    if (marionette) {
      slides.push({
        id: 'marionette',
        message: D.marionette,
        tokens: [{ kind: 'player', playerId: marionette.id }],
      })
    }
    if (player.roleId === 'lleech') {
      slides.push({ id: 'lleech_host', message: D.lleechHost, tokens: [] })
    }
  } else if (team === 'minion' && player.roleId !== 'marionette') {
    const demon = ps.find((p) => teamOf(p.roleId) === 'demon')
    if (demon) {
      slides.push({
        id: 'demon',
        message: D.demonSecret,
        tokens: [{ kind: 'player', playerId: demon.id }],
      })
    }
    if (player.roleId === 'widow') {
      slides.push({ id: 'widow_grimoire', message: D.widowGrimoire, tokens: [] })
      // "1 good player knows a Widow is in play." Filed on the Widow, not
      // auto-injected into a good player's deck — the narrator flashes it to
      // whichever good player they choose.
      slides.push({
        id: 'widow_in_play',
        message: D.widowInPlay,
        tokens: [{ kind: 'role', roleId: 'widow' }],
      })
    }
  }

  // ── Per-character info ────────────────────────────────────────────────────
  // These are storyteller *choices* the manual board never recorded, so the
  // slots start empty (selectRole/selectPlayer) and the narrator fills them on
  // the reveal. Contrast the auto-filled evil-team slides above, which the board
  // fully determines.

  /** WW/Librarian/Investigator: "this <team> is in play" + "one of these two". */
  const learnsTeam = (
    want: TeamId,
    inPlayMsg: string,
    playersMsg: string,
  ): DeckSlide[] => [
    { id: `${want}_char`, message: inPlayMsg, tokens: [{ kind: 'selectRole' }] },
    {
      id: `${want}_players`,
      message: playersMsg,
      tokens: [{ kind: 'selectPlayer' }, { kind: 'selectPlayer' }],
    },
  ]

  switch (player.roleId) {
    case 'washerwoman':
      slides.push(...learnsTeam('townsfolk', D.townsfolkInPlay, D.townsfolkPlayers))
      break
    case 'librarian':
      slides.push(...learnsTeam('outsider', D.outsiderInPlay, D.outsiderPlayers))
      break
    case 'investigator':
      slides.push(...learnsTeam('minion', D.minionInPlay, D.minionPlayers))
      break
    case 'fortune_teller':
      slides.push({ id: 'ft_choose', message: D.fortuneTeller, tokens: [] })
      break
    case 'empath': {
      const n = countEvilLivingNeighbors(player, state)
      slides.push({ id: 'empath', message: t.game.infoTokens.neighborsEvil, tokens: [{ kind: 'value', value: String(n) }] })
      break
    }
    case 'clockmaker': {
      const steps = demonToNearestMinion(state)
      if (steps !== null) {
        slides.push({ id: 'clockmaker', message: D.clockmaker, tokens: [{ kind: 'value', value: String(steps) }] })
      }
      break
    }
    // Grandmother's grandchild shows a filled name by default (a good player) —
    // still tap-to-change on the reveal. Steward's good player is left as an
    // explicit storyteller pick (empty slot).
    case 'grandmother': {
      const grandchild = ps.find((p) => p.id !== player.id && !isEvilRole(p.roleId))
      slides.push({
        id: 'grandchild',
        message: D.grandchild,
        tokens: [grandchild ? { kind: 'player', playerId: grandchild.id } : { kind: 'selectPlayer' }],
      })
      break
    }
    case 'steward':
      slides.push({ id: 'steward', message: D.stewardGood, tokens: [{ kind: 'selectPlayer' }] })
      break
    case 'knight':
      slides.push({
        id: 'knight',
        message: D.knightNotDemon,
        tokens: [{ kind: 'selectPlayer' }, { kind: 'selectPlayer' }],
      })
      break
    case 'chef':
      slides.push({
        id: 'chef',
        message: D.chef,
        tokens: [{ kind: 'value', value: String(adjacentEvilPairs(state)) }],
      })
      break
    // The board doesn't record which death was "today's" execution, so the
    // Undertaker's character is a narrator pick, not auto-filled.
    case 'undertaker':
      slides.push({ id: 'undertaker', message: D.undertaker, tokens: [{ kind: 'selectRole' }] })
      break
    case 'ravenkeeper':
      slides.push(
        { id: 'ravenkeeper_choose', message: D.ravenkeeperChoose, tokens: [] },
        { id: 'ravenkeeper', message: D.ravenkeeper, tokens: [{ kind: 'selectRole' }] },
      )
      break
    // Text-only prompts — the narrator reads them, then acts on the board
    // (Spy flips to the grimoire; the rest are night/day directions).
    case 'spy':
      slides.push({ id: 'spy_grimoire', message: D.spyGrimoire, tokens: [] })
      break
    case 'imp':
      slides.push({ id: 'imp_kill', message: D.impKill, tokens: [] })
      break
    case 'poisoner':
      slides.push({ id: 'poisoner_choose', message: D.poisonerChoose, tokens: [] })
      break
    case 'monk':
      slides.push({ id: 'monk_protect', message: D.monkProtect, tokens: [] })
      break
    case 'butler':
      slides.push({ id: 'butler_master', message: D.butlerMaster, tokens: [] })
      break
  }

  return slides
}

/** Evil count among the nearest living seat on each side (Empath's ability). */
function countEvilLivingNeighbors(player: PlayerState, state: GameState): number {
  const ps = state.players
  const n = ps.length
  const idx = ps.findIndex((p) => p.id === player.id)
  if (idx < 0 || n < 2) return 0

  const nearestAlive = (dir: 1 | -1): PlayerState | null => {
    for (let step = 1; step < n; step++) {
      const j = (((idx + dir * step) % n) + n) % n
      if (j === idx) break
      if (isAlive(ps[j])) return ps[j]
    }
    return null
  }

  const isEvil = (p: PlayerState | null) => !!p && isEvilRole(p.roleId)

  const left = nearestAlive(-1)
  const right = nearestAlive(1)
  // Tiny circles: both sides can resolve to the same lone survivor — count once.
  if (left && right && left.id === right.id) return isEvil(left) ? 1 : 0
  return (isEvil(left) ? 1 : 0) + (isEvil(right) ? 1 : 0)
}

/** Chef: number of adjacent evil pairs around the (circular) seating. */
function adjacentEvilPairs(state: GameState): number {
  const ps = state.players
  const n = ps.length
  if (n < 2) return 0
  const evil = (p: PlayerState) => isEvilRole(p.roleId)
  // Two seats form a single pair, not two — don't double-count the wrap.
  if (n === 2) return evil(ps[0]) && evil(ps[1]) ? 1 : 0
  let count = 0
  for (let i = 0; i < n; i++) {
    if (evil(ps[i]) && evil(ps[(i + 1) % n])) count++
  }
  return count
}

/** Clockmaker: fewest seats between the Demon and its nearest Minion (null if either absent). */
function demonToNearestMinion(state: GameState): number | null {
  const ps = state.players
  const n = ps.length
  const demonIdx = ps.findIndex((p) => teamOf(p.roleId) === 'demon')
  if (demonIdx < 0) return null
  let best: number | null = null
  ps.forEach((p, i) => {
    if (teamOf(p.roleId) !== 'minion') return
    const raw = Math.abs(i - demonIdx)
    const dist = Math.min(raw, n - raw) // circular
    if (best === null || dist < best) best = dist
  })
  return best
}
