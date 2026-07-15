import { getRole } from './roles'
import { EDITION_NIGHT_ORDER } from './roles/editions'

/**
 * Night-order calculator. Every waking character carries its position on the
 * first night and on other nights (null = it does not act that night). The
 * narrator panel collects the characters actually in play, adds the fixed
 * narrator steps (Dusk, Minion/Demon info, Dawn), sorts the whole set by these
 * numbers, and renders the result. There is no per-script sequence to maintain
 * by hand — adding a new waking character is one row in ROLE_ORDER.
 *
 * The numbers are the canonical BotC night-order positions (bra1n/townsquare
 * roles.json `firstNight`/`otherNight`, 0 → null); only their relative order
 * matters, so gaps are fine and leave room to slot future characters in. To
 * refresh, re-copy the two integers from that file — the editions below are
 * already on the same scale. Role ids are the app's snake_case ids
 * (fortune_teller, scarlet_woman).
 */

export type NightOrderEntry =
  | { kind: 'marker'; id: 'dusk' | 'dawn' } // full-width divider
  | { kind: 'step'; id: 'minion_info' | 'demon_info' } // narrator info step (a row)
  | { kind: 'role'; roleId: string }

type NightSlot = { first: number | null; other: number | null }

const ROLE_ORDER: Record<string, NightSlot> = {
  poisoner: { first: 17, other: 7 },
  washerwoman: { first: 33, other: null },
  librarian: { first: 34, other: null },
  investigator: { first: 35, other: null },
  chef: { first: 36, other: null },
  empath: { first: 37, other: 53 },
  fortune_teller: { first: 38, other: 54 },
  butler: { first: 39, other: 67 },
  spy: { first: 49, other: 68 },
  monk: { first: null, other: 12 },
  scarlet_woman: { first: null, other: 19 },
  imp: { first: null, other: 24 },
  ravenkeeper: { first: null, other: 52 },
  undertaker: { first: null, other: 55 },
  // Sects & Violets + Bad Moon Rising (canonical positions, same scale).
  ...EDITION_NIGHT_ORDER,
}

// Fixed narrator steps. Dusk/Dawn bookend every night; the two info steps run
// only on the first night, and only when that team is actually in the bag.
// Info steps sit just before the first minion acts (Poisoner is 17). Early
// first-night characters (Philosopher 2, Lunatic 8, Sailor 11) precede them.
const DUSK = 0
const MINION_INFO = 15
const DEMON_INFO = 16
const DAWN = 1000

/**
 * The ordered night sequence for the given night, restricted to the in-play
 * bag: a character appears only if it acts on this night, and the first-night
 * minion/demon info steps appear only when the bag holds that team.
 */
export function getNightOrder(
  which: 'first' | 'other',
  inPlayRoleIds: string[],
): NightOrderEntry[] {
  const first = which === 'first'
  // ponytail: O(n) scans over the bag (<=20 ids) — trivially fine.
  const bagHasTeam = (team: string) =>
    inPlayRoleIds.some((id) => getRole(id)?.team === team)

  const steps: { order: number; entry: NightOrderEntry }[] = [
    { order: DUSK, entry: { kind: 'marker', id: 'dusk' } },
    { order: DAWN, entry: { kind: 'marker', id: 'dawn' } },
  ]

  if (first && bagHasTeam('minion'))
    steps.push({ order: MINION_INFO, entry: { kind: 'step', id: 'minion_info' } })
  if (first && bagHasTeam('demon'))
    steps.push({ order: DEMON_INFO, entry: { kind: 'step', id: 'demon_info' } })

  for (const roleId of new Set(inPlayRoleIds)) {
    const slot = ROLE_ORDER[roleId]
    const order = slot ? (first ? slot.first : slot.other) : null
    if (order != null) steps.push({ order, entry: { kind: 'role', roleId } })
  }

  return steps.sort((a, b) => a.order - b.order).map((s) => s.entry)
}
