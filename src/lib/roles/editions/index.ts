/**
 * Base-box editions (Sects & Violets, Bad Moon Rising) for the manual Grimoire.
 *
 * These characters have no night-action engine — the storyteller runs them by
 * hand. This module is intentionally React-free (pure data + i18n registration)
 * so `nightOrder.ts`, `reminders/catalog.ts`, and `scripts` can consume it
 * without dragging component code into their graphs. RoleDefinitions (which need
 * a RoleReveal component) are built in `./defs` to avoid an import cycle back
 * through `roles/index`. Trouble Brewing keeps its hand-written per-role folders.
 */
import type { EditionRole } from './types'
import { registerRoleTranslations } from '../../i18n/registry'
import { SECTS_AND_VIOLETS } from './sectsAndViolets'
import { BAD_MOON_RISING } from './badMoonRising'
import { CATALOG_CHARACTERS } from './catalog'
import { getReminderTokenArt } from '../../reminders/tokenArt'

export const SECTS_AND_VIOLETS_IDS = SECTS_AND_VIOLETS.map((r) => r.id)
export const BAD_MOON_RISING_IDS = BAD_MOON_RISING.map((r) => r.id)

// SNV + BMR are hand-curated (reminder icons/effects); the catalog fills every
// other official character (Experimental, Fabled, Travellers) as data-only rows.
export const EDITION_ROLES: EditionRole[] = [
  ...SECTS_AND_VIOLETS,
  ...BAD_MOON_RISING,
  ...CATALOG_CHARACTERS,
]

// Register English translations at import time (app is English-only; the i18n
// registry falls back to 'en' for any other language).
for (const role of EDITION_ROLES) {
  registerRoleTranslations(role.id, 'en', {
    name: role.name,
    description: role.ability,
    ability: role.ability,
  })
}

/** Canonical night-order positions keyed by role id (null = no action). */
export const EDITION_NIGHT_ORDER: Record<
  string,
  { first: number | null; other: number | null }
> = Object.fromEntries(
  EDITION_ROLES.map((r) => [r.id, { first: r.firstNight, other: r.otherNight }]),
)

/** Reminder tokens keyed by role id, with official token art attached. */
export const EDITION_REMINDERS: Record<string, EditionRole['reminders']> =
  Object.fromEntries(
    EDITION_ROLES.map((r) => [
      r.id,
      r.reminders.map((reminder) => ({
        ...reminder,
        tokenSrc: getReminderTokenArt(r.id, reminder.label),
      })),
    ]),
  )
