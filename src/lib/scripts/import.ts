import { RoleId } from '../roles/types'
import { CustomCharacter } from '../types'
import { TeamId } from '../teams/types'
import { ALL_ROLE_IDS } from './index'

export type ScriptImportResult = {
  name?: string
  author?: string
  /** Playable roles, in script order, de-duplicated (official + homebrew). */
  roles: RoleId[]
  /** Homebrew characters defined inline in the script (non-official). */
  customs: CustomCharacter[]
  /** Ids with neither known data nor inline definition (not playable). */
  dropped: string[]
}

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

const VALID_TEAMS: TeamId[] = [
  'townsfolk',
  'outsider',
  'minion',
  'demon',
  'traveller',
  'fabled',
]

/** Coerce a script-tool team string ('traveler' etc.) into a TeamId. */
function toTeam(raw: unknown): TeamId {
  const n = normalize(String(raw ?? ''))
  if (n === 'traveler' || n === 'traveller') return 'traveller'
  return (VALID_TEAMS.find((t) => t === n) as TeamId) ?? 'townsfolk'
}

/** A script entry with inline character data (homebrew). */
function toCustomCharacter(
  id: string,
  entry: Record<string, unknown>,
): CustomCharacter | null {
  const name = typeof entry.name === 'string' ? entry.name : undefined
  const ability = typeof entry.ability === 'string' ? entry.ability : ''
  // Needs at least a display name to be worth placing; bare {id} isn't custom.
  if (!name) return null
  const reminders = Array.isArray(entry.reminders)
    ? entry.reminders.filter((r): r is string => typeof r === 'string')
    : undefined
  return {
    id: id.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''),
    name,
    team: toTeam(entry.team),
    ability,
    image: typeof entry.image === 'string' ? entry.image : undefined,
    firstNight: typeof entry.firstNight === 'number' ? entry.firstNight : null,
    otherNight: typeof entry.otherNight === 'number' ? entry.otherNight : null,
    reminders,
  }
}

// normalized id form -> our RoleId (e.g. "fortuneteller" -> "fortune_teller")
const BY_NORMALIZED: Record<string, RoleId> = Object.fromEntries(
  ALL_ROLE_IDS.map((id) => [normalize(id), id]),
) as Record<string, RoleId>

/**
 * Parse an official/custom Blood on the Clocktower script JSON into the roles
 * we implement. Accepts the script-tool formats:
 *   ["washerwoman", ...]                               (bare id list)
 *   [{"id":"_meta","name":"...","author":"..."}, ...]  (with a meta header)
 *   [{"id":"washerwoman"}, ...]                         (object entries)
 * Ids are matched loosely (case/underscore/space-insensitive), so official
 * "fortuneteller"/"scarletwoman" map to our fortune_teller/scarlet_woman.
 * Roles we don't implement land in `dropped` — they can't be played yet.
 *
 * @throws Error('invalid_json') if the text isn't JSON, Error('not_an_array')
 *   if it isn't a JSON array.
 */
export function parseScriptJson(text: string): ScriptImportResult {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('invalid_json')
  }
  if (!Array.isArray(data)) throw new Error('not_an_array')

  let name: string | undefined
  let author: string | undefined
  const roles: RoleId[] = []
  const seen = new Set<string>()
  const customs: CustomCharacter[] = []
  const dropped: string[] = []

  for (const entry of data) {
    const isObject = !!entry && typeof entry === 'object'
    const rawId =
      typeof entry === 'string'
        ? entry
        : isObject && 'id' in entry
          ? String((entry as { id: unknown }).id)
          : null
    if (!rawId) continue

    if (normalize(rawId) === 'meta') {
      const meta = entry as { name?: unknown; author?: unknown }
      if (typeof meta.name === 'string') name = meta.name
      if (typeof meta.author === 'string') author = meta.author
      continue
    }

    // Official character we have data for — always wins over inline data.
    const known = BY_NORMALIZED[normalize(rawId)]
    if (known) {
      if (!seen.has(known)) {
        seen.add(known)
        roles.push(known)
      }
      continue
    }

    // Homebrew character with inline definition (id + name at minimum).
    const custom = isObject
      ? toCustomCharacter(rawId, entry as Record<string, unknown>)
      : null
    if (custom) {
      if (!seen.has(custom.id)) {
        seen.add(custom.id)
        customs.push(custom)
        roles.push(custom.id as RoleId)
      }
      continue
    }

    dropped.push(rawId)
  }

  return { name, author, roles, customs, dropped }
}
