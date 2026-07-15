import { RoleDefinition, RoleId } from './types'
import Imp from './definition/imp'
import Villager from './definition/villager'
// Trouble Brewing
import Washerwoman from './definition/trouble-brewing/washerwoman'
import Librarian from './definition/trouble-brewing/librarian'
import Investigator from './definition/trouble-brewing/investigator'
import Chef from './definition/trouble-brewing/chef'
import Empath from './definition/trouble-brewing/empath'
import Monk from './definition/trouble-brewing/monk'
import Soldier from './definition/trouble-brewing/soldier'
import FortuneTeller from './definition/trouble-brewing/fortune-teller'
import Undertaker from './definition/trouble-brewing/undertaker'
import Ravenkeeper from './definition/trouble-brewing/ravenkeeper'
import Virgin from './definition/trouble-brewing/virgin'
import Slayer from './definition/trouble-brewing/slayer'
import Mayor from './definition/trouble-brewing/mayor'
import Saint from './definition/trouble-brewing/saint'
import ScarletWoman from './definition/trouble-brewing/scarlet-woman'
import Recluse from './definition/trouble-brewing/recluse'
import Poisoner from './definition/trouble-brewing/poisoner'
import Drunk from './definition/trouble-brewing/drunk'
import Butler from './definition/trouble-brewing/butler'
import Baron from './definition/trouble-brewing/baron'
import Spy from './definition/trouble-brewing/spy'
// Sects & Violets + Bad Moon Rising (data-driven, manual-board only)
import { buildEditionRoleDefinitions } from './editions/defs'
import { DefaultRoleReveal } from '../../components/items/DefaultRoleReveal'
import {
  getCustomCharacter,
  registerCustomCharacterData,
} from './customCharacters'
import type { CustomCharacter } from '../types'

export const ROLES: Record<string, RoleDefinition> = {
  imp: Imp,
  villager: Villager,
  washerwoman: Washerwoman,
  librarian: Librarian,
  investigator: Investigator,
  chef: Chef,
  empath: Empath,
  fortune_teller: FortuneTeller,
  undertaker: Undertaker,
  monk: Monk,
  ravenkeeper: Ravenkeeper,
  soldier: Soldier,
  virgin: Virgin,
  slayer: Slayer,
  mayor: Mayor,
  saint: Saint,
  scarlet_woman: ScarletWoman,
  recluse: Recluse,
  poisoner: Poisoner,
  drunk: Drunk,
  butler: Butler,
  baron: Baron,
  spy: Spy,
  ...buildEditionRoleDefinitions(),
}

// Re-export scripts module for backward compatibility
export { SCRIPTS, type ScriptId } from '../scripts'

// Get all roles sorted by night order (roles that wake at night)
export function getNightOrderRoles(): RoleDefinition[] {
  return Object.values(ROLES)
    .filter((role) => role.nightOrder !== null)
    .sort((a, b) => (a.nightOrder ?? 0) - (b.nightOrder ?? 0))
}

/** Thin, data-only definition for a homebrew character (run by hand). */
function buildCustomRoleDefinition(custom: CustomCharacter): RoleDefinition {
  return {
    id: custom.id as RoleId,
    team: custom.team,
    icon: 'user',
    nightOrder: null,
    chaos: 0,
    RoleReveal: DefaultRoleReveal,
    NightAction: null,
  }
}

/**
 * Register homebrew characters imported inline in a script. Populates the data
 * registry + i18n AND injects RoleDefinitions into `ROLES`, so both `getRole`
 * and direct `ROLES[id]` consumers resolve them. Called at import time and when
 * a persisted game with custom characters is loaded.
 */
export function registerCustomCharacters(chars: CustomCharacter[] | undefined): void {
  if (!chars) return
  registerCustomCharacterData(chars)
  for (const c of chars) ROLES[c.id] = buildCustomRoleDefinition(c)
}

export function getRole(roleId: string): RoleDefinition | undefined {
  const known = ROLES[roleId as RoleId]
  if (known) return known
  // Fallback for a custom character that was registered into the data registry
  // but not (yet) the ROLES table — build its definition on the fly.
  const custom = getCustomCharacter(roleId)
  return custom ? buildCustomRoleDefinition(custom) : undefined
}

export function getAllRoles(): RoleDefinition[] {
  return Object.values(ROLES)
}

// Re-export distribution helpers from scripts module for backward compatibility
export {
  getRecommendedDistribution,
  type RoleDistribution,
} from '../scripts'

export * from './types'
