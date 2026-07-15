import { isEvilTeam, TeamId } from '../teams'
import { getCustomCharacter } from './customCharacters'

/**
 * Official Blood on the Clocktower token art.
 *
 * Art lives in `/public/assets/characters`. App role ids are snake_case, while
 * the art files drop separators (fortune_teller → fortuneteller,
 * scarlet_woman → scarletwoman). Tint follows the role's own alignment:
 * good roles use the blue (`_g`) token, evil roles the red (`_e`) token.
 *
 * Roles without official art (custom roles like the Villager, or imported
 * script roles the app doesn't know) fall back to the generic team token.
 */

// Base names present in /public/assets/characters/tb (Trouble Brewing + its
// travellers). Kept as a static set so lookups need no filesystem access.
const TB_ART_BASES = new Set([
  'baron',
  'beggar',
  'bureaucrat',
  'butler',
  'chef',
  'drunk',
  'empath',
  'fortuneteller',
  'gunslinger',
  'imp',
  'investigator',
  'librarian',
  'mayor',
  'monk',
  'poisoner',
  'ravenkeeper',
  'recluse',
  'saint',
  'scapegoat',
  'scarletwoman',
  'slayer',
  'soldier',
  'spy',
  'thief',
  'undertaker',
  'virgin',
  'washerwoman',
])

// Vite serves the app (and its public/ assets) under this base path.
// Hardcoded absolute `/assets/...` URLs ignore it, so prefix every art URL.
const BASE = import.meta.env.BASE_URL

const GENERIC_BY_TEAM: Record<TeamId, string> = {
  townsfolk: 'townsfolk',
  outsider: 'outsider',
  minion: 'minion',
  demon: 'demon',
  traveller: 'traveller',
  fabled: 'fabled',
}

/** Convert an app role id to its art file base name. */
function artBase(roleId: string): string {
  return roleId.replace(/_/g, '')
}

/**
 * Resolve the token art URL for a role, tinted by the role's own alignment.
 */
export function getRoleArt(roleId: string, team: TeamId): string {
  const tint = isEvilTeam(team) ? 'e' : 'g'
  const base = artBase(roleId)
  if (TB_ART_BASES.has(base)) {
    return `${BASE}assets/characters/tb/${base}_${tint}.webp`
  }
  // Fabled art has no alignment tint (single token); everything else is _g/_e.
  if (team === 'fabled') return `${BASE}assets/characters/generic/fabled.webp`
  const generic = GENERIC_BY_TEAM[team] ?? 'custom'
  return `${BASE}assets/characters/generic/${generic}_${tint}.webp`
}

/** True if the role has official art (vs. a generic fallback). */
export function hasRoleArt(roleId: string): boolean {
  return TB_ART_BASES.has(artBase(roleId))
}

/**
 * Full pre-composed character token PNG (parchment disc, border, art, and the
 * role name all baked in — the physical game piece as a single image). App role
 * ids are snake_case; token files are kebab-case (fortune_teller →
 * fortune-teller.png). Unknown/custom roles fall back to `_blank.png` at render
 * time via the <img> onError handler in CharacterToken.
 */
export function getTokenArt(roleId: string): string {
  // Homebrew characters carry an author-provided token image URL.
  const custom = getCustomCharacter(roleId)
  if (custom?.image) return custom.image
  return `${BASE}assets/tokens/${roleId.replace(/_/g, '-')}.png`
}

/** Blank token disc for custom/unknown roles with no baked token PNG. */
export const BLANK_TOKEN = `${BASE}assets/tokens/_blank.png`

/** Parchment token-back texture (the physical token look). */
export const PARCHMENT_TEXTURE = `${BASE}assets/textures/pback.png`

/** The black swallowtail shroud draped over a dead player's token. */
export const SHROUD_TEXTURE = `${BASE}assets/textures/shroud.png`
