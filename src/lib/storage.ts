import { Game } from './types'

const STORAGE_KEY = 'grimoire_games'
const CURRENT_GAME_KEY = 'grimoire_current_game'

// ============================================================================
// GAME STORAGE
// ============================================================================

export function saveGame(game: Game): void {
  const games = getAllGames()
  const existingIndex = games.findIndex((g) => g.id === game.id)

  if (existingIndex >= 0) {
    games[existingIndex] = game
  } else {
    games.push(game)
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(games))
}

export function getAllGames(): Game[] {
  const data = localStorage.getItem(STORAGE_KEY)
  if (!data) return []

  try {
    return JSON.parse(data) as Game[]
  } catch {
    return []
  }
}

export function getGame(gameId: string): Game | undefined {
  const games = getAllGames()
  return games.find((g) => g.id === gameId)
}

export function deleteGame(gameId: string): void {
  const games = getAllGames().filter((g) => g.id !== gameId)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(games))

  // Clear current game if it was deleted
  if (getCurrentGameId() === gameId) {
    clearCurrentGame()
  }
}

// ============================================================================
// CURRENT GAME
// ============================================================================

export function setCurrentGameId(gameId: string): void {
  localStorage.setItem(CURRENT_GAME_KEY, gameId)
}

export function getCurrentGameId(): string | null {
  return localStorage.getItem(CURRENT_GAME_KEY)
}

export function clearCurrentGame(): void {
  localStorage.removeItem(CURRENT_GAME_KEY)
}

export function getCurrentGame(): Game | undefined {
  const gameId = getCurrentGameId()
  if (!gameId) return undefined
  return getGame(gameId)
}

// ============================================================================
// GAME LIST HELPERS
// ============================================================================

export type GameSummary = {
  id: string
  name: string
  createdAt: number
  playerCount: number
  phase: string
  round: number
}

export function getLastGamePlayers(): string[] {
  const games = getAllGames()
  if (games.length === 0) return []

  const sorted = [...games].sort((a, b) => b.createdAt - a.createdAt)
  const lastGame = sorted[0]
  const lastEntry = lastGame.history.at(-1)
  if (!lastEntry?.stateAfter?.players) return []

  return lastEntry.stateAfter.players.map((p) => p.name)
}

export function getGameSummaries(): GameSummary[] {
  const games = getAllGames()

  return games
    .map((game) => {
      const lastEntry = game.history.at(-1)
      const state = lastEntry?.stateAfter

      return {
        id: game.id,
        name: game.name,
        createdAt: game.createdAt,
        playerCount: state?.players.length ?? 0,
        phase: state?.phase ?? 'unknown',
        round: state?.round ?? 0,
      }
    })
    .sort((a, b) => b.createdAt - a.createdAt)
}

// ============================================================================
// PLAYER ROSTER
// ============================================================================
// Saved people names so the storyteller can tap-to-add regulars instead of
// retyping every game. Device-local only.

const ROSTER_KEY = 'grimoire_roster'

export function getRoster(): string[] {
  const data = localStorage.getItem(ROSTER_KEY)
  if (!data) return []

  try {
    return JSON.parse(data) as string[]
  } catch {
    return []
  }
}

/** Merge names into the roster (case-insensitive dedupe), kept alphabetical. */
export function addToRoster(names: string[]): void {
  const existing = getRoster()
  const seen = new Set(existing.map((n) => n.toLowerCase()))
  const merged = [...existing]

  for (const raw of names) {
    const name = raw.trim()
    if (name && !seen.has(name.toLowerCase())) {
      seen.add(name.toLowerCase())
      merged.push(name)
    }
  }

  merged.sort((a, b) => a.localeCompare(b))
  localStorage.setItem(ROSTER_KEY, JSON.stringify(merged))
}

export function removeFromRoster(name: string): void {
  const next = getRoster().filter(
    (n) => n.toLowerCase() !== name.toLowerCase(),
  )
  localStorage.setItem(ROSTER_KEY, JSON.stringify(next))
}

// ============================================================================
// BOARD POSITIONS
// ============================================================================
// Cosmetic per-game token offsets for the Grimoire Board. Never written to
// game.history — this is purely a local layout preference.

const BOARD_POSITIONS_KEY = 'grimoire_board_positions'

export type BoardPosition = { x: number; y: number }

function getAllBoardPositions(): Record<string, Record<string, BoardPosition>> {
  const data = localStorage.getItem(BOARD_POSITIONS_KEY)
  if (!data) return {}

  try {
    return JSON.parse(data) as Record<string, Record<string, BoardPosition>>
  } catch {
    return {}
  }
}

export function getBoardPositions(
  gameId: string,
): Record<string, BoardPosition> {
  return getAllBoardPositions()[gameId] ?? {}
}

export function setBoardPositions(
  gameId: string,
  positions: Record<string, BoardPosition>,
): void {
  const all = getAllBoardPositions()
  all[gameId] = positions
  localStorage.setItem(BOARD_POSITIONS_KEY, JSON.stringify(all))
}

/** Drop one player's persisted board offset (e.g. when they're removed from the game). */
export function clearBoardPosition(gameId: string, playerId: string): void {
  const all = getAllBoardPositions()
  const positions = all[gameId]
  if (!positions || !(playerId in positions)) return

  delete positions[playerId]
  localStorage.setItem(BOARD_POSITIONS_KEY, JSON.stringify(all))
}
