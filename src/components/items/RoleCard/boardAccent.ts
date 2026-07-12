import { TeamId } from '../../../lib/teams'

// Team ink accent on the real-board palette — townsfolk/outsider blue, minion/
// demon red. Mirrors the board.* Tailwind tokens. (RoleCard keeps its own copy
// to stay decoupled while a parallel edit is in flight.)
export const TEAM_ACCENT: Record<TeamId, string> = {
  townsfolk: '#2F5C8F',
  outsider: '#5E8CBA',
  minion: '#B84A2C',
  demon: '#8A2222',
}

export const GOLD = '#C9A24B'
export const INK = '#241C11'
