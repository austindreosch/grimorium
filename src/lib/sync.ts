// Cloud backup (Option A), GitHub-native. Device-local play stays the source of
// truth; the whole game+roster blob is mirrored to a single *secret Gist* so
// nothing is lost if the tablet dies. No database, no server — just the GitHub
// Gist API over fetch.
//
// Auth: GitHub has no anonymous writes, so saving needs the user's own token,
// entered once and kept in localStorage. The token IS both the credential and
// the recovery handle: paste it on a new device and it finds your backup Gist.
// Use a fine-grained token with only Gists read/write — revocable anytime.
//
// Offline-first: writes set a dirty flag and flush on reconnect.
// ponytail: whole-blob PATCH per change (debounced). Fine for a storyteller's
// handful of games; a Gist file holds up to ~1MB (we fall back to raw_url if a
// pulled file is truncated).

import { Game } from './types'
import {
  getAllGames,
  getRoster,
  applyRemoteGames,
  applyRemoteRoster,
} from './storage'

const API = 'https://api.github.com'
const GIST_FILE = 'grimorium-backup.json'
const GIST_DESC = 'grimorium-backup'

const TOKEN_KEY = 'grimoire_gh_token'
const GIST_ID_KEY = 'grimoire_gist_id'
const DIRTY_KEY = 'grimoire_sync_dirty'
const SAVE_DEBOUNCE_MS = 2500

// ── Credential ─────────────────────────────────────────────────────────────

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}
export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token.trim())
}
export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(GIST_ID_KEY)
}
export function isConnected(): boolean {
  return !!getToken()
}

function getGistId(): string | null {
  return localStorage.getItem(GIST_ID_KEY)
}
function setGistId(id: string): void {
  localStorage.setItem(GIST_ID_KEY, id)
}

// ── Dirty flag (offline durability) ────────────────────────────────────────

function isDirty(): boolean {
  return localStorage.getItem(DIRTY_KEY) === '1'
}
function setDirty(v: boolean): void {
  if (v) localStorage.setItem(DIRTY_KEY, '1')
  else localStorage.removeItem(DIRTY_KEY)
}

// ── GitHub fetch ───────────────────────────────────────────────────────────

function gh(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${getToken()}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
    },
  })
}

/** Find this account's backup Gist. ok=false → auth/network failure. */
async function findGist(): Promise<{ ok: boolean; id: string | null }> {
  const res = await gh('/gists?per_page=100')
  if (!res.ok) return { ok: false, id: null }
  const gists = (await res.json()) as Array<{
    id: string
    files: Record<string, unknown>
  }>
  const match = gists.find((g) => g.files && GIST_FILE in g.files)
  return { ok: true, id: match?.id ?? null }
}

// ── Push (called by storage.ts after every mutating write) ─────────────────

let saveTimer: ReturnType<typeof setTimeout> | undefined

export function markDirtyAndSave(): void {
  if (!getToken()) return
  setDirty(true)
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => void save(), SAVE_DEBOUNCE_MS)
}

let saving = false
async function save(): Promise<boolean> {
  if (!getToken() || saving || !navigator.onLine) return false
  saving = true
  try {
    const content = JSON.stringify({ games: getAllGames(), roster: getRoster() })
    const files = { [GIST_FILE]: { content } }

    let id = getGistId()
    if (!id) id = (await findGist()).id

    const res = id
      ? await gh(`/gists/${id}`, { method: 'PATCH', body: JSON.stringify({ files }) })
      : await gh('/gists', {
          method: 'POST',
          body: JSON.stringify({ description: GIST_DESC, public: false, files }),
        })

    if (!res.ok) return false
    const gist = (await res.json()) as { id: string }
    setGistId(gist.id)
    setDirty(false)
    return true
  } catch {
    return false // stays dirty → retried on next change or reconnect
  } finally {
    saving = false
  }
}

// ── Pull ───────────────────────────────────────────────────────────────────

export type PullResult = 'ok' | 'empty' | 'error'

export async function pullAll(): Promise<PullResult> {
  if (!getToken() || !navigator.onLine) return 'error'
  try {
    let id = getGistId()
    if (!id) {
      const found = await findGist()
      if (!found.ok) return 'error'
      if (!found.id) return 'empty'
      id = found.id
      setGistId(id)
    }

    const res = await gh(`/gists/${id}`)
    if (!res.ok) return 'error'
    const gist = (await res.json()) as {
      files?: Record<string, { content: string; truncated?: boolean; raw_url?: string }>
    }
    const file = gist.files?.[GIST_FILE]
    if (!file) return 'empty'

    // Gist API truncates file content at ~1MB; fetch the full blob if so.
    const content =
      file.truncated && file.raw_url
        ? await (await fetch(file.raw_url)).text()
        : file.content

    const parsed = JSON.parse(content) as { games?: Game[]; roster?: string[] }
    if (parsed.games) applyRemoteGames(parsed.games)
    if (parsed.roster) applyRemoteRoster(parsed.roster)
    return 'ok'
  } catch {
    return 'error'
  }
}

// ── Connect / disconnect (used by the UI) ──────────────────────────────────

/**
 * Adopt a token and reconcile with GitHub. 'ok' → an existing backup was pulled
 * (caller should reload); 'empty' → token valid, no backup yet (one was
 * created); 'error' → bad token/network (token reverted).
 */
export async function connect(token: string): Promise<PullResult> {
  const previous = getToken()
  setToken(token)
  localStorage.removeItem(GIST_ID_KEY) // new account → forget any cached Gist
  const result = await pullAll()
  if (result === 'error') {
    if (previous) setToken(previous)
    else clearToken()
    return 'error'
  }
  if (result === 'empty') await save() // create the backup Gist for this account
  return result
}

export function disconnect(): void {
  clearToken()
}

// ── Startup ──────────────────────────────────────────────────────────────

let inited = false
export function initSync(): void {
  if (inited) return
  inited = true
  window.addEventListener('online', () => {
    if (getToken() && isDirty()) void save()
  })
  if (getToken()) {
    void pullAll().finally(() => {
      if (isDirty()) void save()
    })
  }
}
