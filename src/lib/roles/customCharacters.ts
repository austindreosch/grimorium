/**
 * Runtime registry for homebrew characters imported inline from a script JSON.
 *
 * Official characters are all baked into the app (TB engine + editions +
 * catalog). Homebrew characters are author-defined and only known at import
 * time, so they live in this mutable module-level map instead of the static
 * `ROLES` table. `getRole`, the i18n name/ability lookups, and `getTokenArt`
 * all consult this registry as a fallback, so a registered custom character
 * renders on the manual board like any other.
 *
 * The map must be repopulated whenever a persisted game with custom characters
 * is loaded (see `registerCustomCharacters`) — it is not itself persisted.
 */
import type { CustomCharacter } from '../types'
import { registerRoleTranslations } from '../i18n/registry'

const registry = new Map<string, CustomCharacter>()

/**
 * Add custom characters to the runtime registry (idempotent by id) and register
 * their name/ability so the i18n lookups resolve them. App is English-only for
 * homebrew content; the registry falls back to 'en' for any other language.
 *
 * Prefer `registerCustomCharacters` from `roles/index`, which also injects thin
 * RoleDefinitions into the `ROLES` table so direct `ROLES[id]` consumers (e.g.
 * the role-selection grid) resolve them too. This lower-level function only
 * populates the data registry + i18n.
 */
export function registerCustomCharacterData(chars: CustomCharacter[] | undefined): void {
  if (!chars) return
  for (const c of chars) {
    registry.set(c.id, c)
    registerRoleTranslations(c.id, 'en', {
      name: c.name,
      description: c.ability,
      ability: c.ability,
    })
  }
}

export function getCustomCharacter(id: string): CustomCharacter | undefined {
  return registry.get(id)
}

export function isCustomCharacter(id: string): boolean {
  return registry.has(id)
}
