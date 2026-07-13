import { beforeEach, it, expect } from 'vitest'
import {
  getRoster,
  addToRoster,
  removeFromRoster,
  getAllGames,
  saveGame,
  applyRemoteGames,
} from './storage'
import { Game } from './types'

// ponytail: minimal localStorage stub — node test env has no DOM.
beforeEach(() => {
  const store = new Map<string, string>()
  globalThis.localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: () => null,
    length: 0,
  } as Storage
})

it('dedupes case-insensitively and keeps the roster alphabetical', () => {
  addToRoster(['Zoe', 'alice', 'Bob'])
  addToRoster(['ALICE', ' Zoe ', 'carol'])
  expect(getRoster()).toEqual(['alice', 'Bob', 'carol', 'Zoe'])
})

it('ignores blank names', () => {
  addToRoster(['  ', 'Dan', ''])
  expect(getRoster()).toEqual(['Dan'])
})

it('removes case-insensitively', () => {
  addToRoster(['Eve', 'Frank'])
  removeFromRoster('EVE')
  expect(getRoster()).toEqual(['Frank'])
})

// ponytail: guards the cloud-merge rule — append-only history means longer wins,
// and remote-only ids get added. Break this and offline edits get clobbered.
const gameWith = (id: string, historyLen: number): Game =>
  ({ id, history: Array.from({ length: historyLen }, (_, i) => ({ id: `${i}` })) }) as Game

it('merges remote games: longer history wins, new ids added, shorter ignored', () => {
  saveGame(gameWith('a', 5)) // local ahead
  saveGame(gameWith('b', 2)) // local behind

  applyRemoteGames([
    gameWith('a', 3), // shorter → ignored
    gameWith('b', 4), // longer → wins
    gameWith('c', 1), // new → added
  ])

  const byId = Object.fromEntries(getAllGames().map((g) => [g.id, g.history.length]))
  expect(byId).toEqual({ a: 5, b: 4, c: 1 })
})
