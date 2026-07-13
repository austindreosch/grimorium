/**
 * Builds thin RoleDefinitions for the edition characters. Kept separate from
 * `./index` because it imports a React component (DefaultRoleReveal), whose
 * module graph loops back to `roles/index`; isolating it here keeps the pure
 * data module cycle-free.
 */
import type { RoleDefinition } from '../types'
import { DefaultRoleReveal } from '../../../components/items/DefaultRoleReveal'
import { EDITION_ROLES } from './index'

/** Thin RoleDefinitions for every edition character (manual-board only). */
export function buildEditionRoleDefinitions(): Record<string, RoleDefinition> {
  const out: Record<string, RoleDefinition> = {}
  for (const role of EDITION_ROLES) {
    out[role.id] = {
      id: role.id as RoleDefinition['id'],
      team: role.team,
      icon: role.icon,
      // Manual-only: never wakes in the guided night loop. The reference
      // night-order panel reads canonical positions from nightOrder.ts instead.
      nightOrder: null,
      chaos: 0,
      RoleReveal: DefaultRoleReveal,
      NightAction: null,
    }
  }
  return out
}
