import { getRole } from './roles'

/**
 * Official Trouble Brewing night order, transcribed once from the canonical
 * BOTC night sheet. This is a static reference table for the night-order panel
 * — it does NOT drive the game (Simple Mode is manual). Markers (Dusk, Dawn,
 * and the first-night minion/demon info steps) are interleaved with roles.
 *
 * Role ids are the app's snake_case ids (fortune_teller, scarlet_woman).
 */

export type NightOrderEntry =
  | { kind: 'marker'; id: 'dusk' | 'dawn' | 'minion_info' | 'demon_info' }
  | { kind: 'role'; roleId: string }

const dusk: NightOrderEntry = { kind: 'marker', id: 'dusk' }
const dawn: NightOrderEntry = { kind: 'marker', id: 'dawn' }
const minionInfo: NightOrderEntry = { kind: 'marker', id: 'minion_info' }
const demonInfo: NightOrderEntry = { kind: 'marker', id: 'demon_info' }
const role = (roleId: string): NightOrderEntry => ({ kind: 'role', roleId })

export const FIRST_NIGHT: NightOrderEntry[] = [
  dusk,
  minionInfo,
  demonInfo,
  role('poisoner'),
  role('washerwoman'),
  role('librarian'),
  role('investigator'),
  role('chef'),
  role('empath'),
  role('fortune_teller'),
  role('butler'),
  role('spy'),
  dawn,
]

export const OTHER_NIGHTS: NightOrderEntry[] = [
  dusk,
  role('poisoner'),
  role('monk'),
  role('scarlet_woman'),
  role('imp'),
  role('ravenkeeper'),
  role('undertaker'),
  role('empath'),
  role('fortune_teller'),
  role('butler'),
  role('spy'),
  dawn,
]

/**
 * The night order filtered to the in-play set: role entries are kept only when
 * their role is in the bag; Dusk/Dawn always stay; the first-night minion/demon
 * info markers stay only when the bag actually contains a minion / a demon.
 */
export function getNightOrder(
  which: 'first' | 'other',
  inPlayRoleIds: string[],
): NightOrderEntry[] {
  const inPlay = new Set(inPlayRoleIds)
  // ponytail: O(n) scan per marker over the bag (<=20 ids) — trivially fine.
  const bagHasTeam = (team: string) =>
    inPlayRoleIds.some((id) => getRole(id)?.team === team)
  const table = which === 'first' ? FIRST_NIGHT : OTHER_NIGHTS
  return table.filter((e) => {
    if (e.kind === 'role') return inPlay.has(e.roleId)
    if (e.id === 'minion_info') return bagHasTeam('minion')
    if (e.id === 'demon_info') return bagHasTeam('demon')
    return true // dusk / dawn always present
  })
}
