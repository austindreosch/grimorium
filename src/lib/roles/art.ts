import { isEvilTeam, TeamId } from '../teams'

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

const GENERIC_BY_TEAM: Record<TeamId, string> = {
  townsfolk: 'townsfolk',
  outsider: 'outsider',
  minion: 'minion',
  demon: 'demon',
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
    return `/assets/characters/tb/${base}_${tint}.webp`
  }
  const generic = GENERIC_BY_TEAM[team] ?? 'custom'
  return `/assets/characters/generic/${generic}_${tint}.webp`
}

/** True if the role has official art (vs. a generic fallback). */
export function hasRoleArt(roleId: string): boolean {
  return TB_ART_BASES.has(artBase(roleId))
}

/** Parchment token-back texture (the physical token look). */
export const PARCHMENT_TEXTURE = '/assets/textures/pback.png'
