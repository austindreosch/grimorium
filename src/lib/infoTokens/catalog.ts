import { Translations } from '../i18n/types'

/**
 * Static catalog of preset "info token" card templates the storyteller can flash
 * to a player (the demon's minions, "you are X", a night direction, etc.).
 *
 * Category is used purely for tile coloring in the library grid — it maps to a
 * board-palette accent (evil = red, good = blue, role = gold, freeform = neutral).
 */
export type InfoTokenCategory = 'evil' | 'good' | 'role' | 'freeform'

export type InfoTokenPreset = {
  id: string
  category: InfoTokenCategory
  /** Localized library-tile label. */
  getLabel: (t: Translations) => string
  /** Localized starter message pre-filled into the editor. */
  getDefaultMessage: (t: Translations) => string
}

// ponytail: plain static array — no external reads, no RNG. Add a preset by
// appending here + its { label, message } pair in en/es infoTokens.presets.
export const INFO_TOKEN_PRESETS: InfoTokenPreset[] = [
  {
    id: 'youAre',
    category: 'role',
    getLabel: (t) => t.game.infoTokens.presets.youAre.label,
    getDefaultMessage: (t) => t.game.infoTokens.presets.youAre.message,
  },
  {
    id: 'yourMinions',
    category: 'evil',
    getLabel: (t) => t.game.infoTokens.presets.yourMinions.label,
    getDefaultMessage: (t) => t.game.infoTokens.presets.yourMinions.message,
  },
  {
    id: 'theDemon',
    category: 'evil',
    getLabel: (t) => t.game.infoTokens.presets.theDemon.label,
    getDefaultMessage: (t) => t.game.infoTokens.presets.theDemon.message,
  },
  {
    id: 'notInPlay',
    category: 'good',
    getLabel: (t) => t.game.infoTokens.presets.notInPlay.label,
    getDefaultMessage: (t) => t.game.infoTokens.presets.notInPlay.message,
  },
  {
    id: 'oneOfThese',
    category: 'role',
    getLabel: (t) => t.game.infoTokens.presets.oneOfThese.label,
    getDefaultMessage: (t) => t.game.infoTokens.presets.oneOfThese.message,
  },
  {
    id: 'characterInPlay',
    category: 'role',
    getLabel: (t) => t.game.infoTokens.presets.characterInPlay.label,
    getDefaultMessage: (t) => t.game.infoTokens.presets.characterInPlay.message,
  },
  {
    id: 'selectedYou',
    category: 'good',
    getLabel: (t) => t.game.infoTokens.presets.selectedYou.label,
    getDefaultMessage: (t) => t.game.infoTokens.presets.selectedYou.message,
  },
  {
    id: 'thisPlayerIs',
    category: 'freeform',
    getLabel: (t) => t.game.infoTokens.presets.thisPlayerIs.label,
    getDefaultMessage: (t) => t.game.infoTokens.presets.thisPlayerIs.message,
  },
]

/** Filter presets by localized label; empty query returns the full catalog. */
export function searchPresets(query: string, t: Translations): InfoTokenPreset[] {
  const q = query.trim().toLowerCase()
  if (!q) return INFO_TOKEN_PRESETS
  return INFO_TOKEN_PRESETS.filter((p) => p.getLabel(t).toLowerCase().includes(q))
}
