import { RoleId } from '../roles/types'
import { ALL_ROLE_IDS } from './index'

export type ScriptImportResult = {
  name?: string
  author?: string
  /** Roles we implement, in script order, de-duplicated. */
  roles: RoleId[]
  /** Ids present in the script that we don't implement yet (not playable). */
  dropped: string[]
}

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

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
  const seen = new Set<RoleId>()
  const dropped: string[] = []

  for (const entry of data) {
    const rawId =
      typeof entry === 'string'
        ? entry
        : entry && typeof entry === 'object' && 'id' in entry
          ? String((entry as { id: unknown }).id)
          : null
    if (!rawId) continue

    if (normalize(rawId) === 'meta') {
      const meta = entry as { name?: unknown; author?: unknown }
      if (typeof meta.name === 'string') name = meta.name
      if (typeof meta.author === 'string') author = meta.author
      continue
    }

    const known = BY_NORMALIZED[normalize(rawId)]
    if (known) {
      if (!seen.has(known)) {
        seen.add(known)
        roles.push(known)
      }
    } else {
      dropped.push(rawId)
    }
  }

  return { name, author, roles, dropped }
}
