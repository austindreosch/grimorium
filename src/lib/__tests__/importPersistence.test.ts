import { describe, it, expect } from 'vitest'
import { setImportedScript, setImportedCustoms } from '../scripts'
import { createGame, getScriptRoleIds } from '../game'
import type { CustomCharacter } from '../types'

describe('imported script persistence', () => {
  it('snapshots roles + customs onto the game and resolves after "reload"', () => {
    const customs: CustomCharacter[] = [
      { id: 'my_guy', name: 'My Guy', team: 'traveller', ability: 'x' },
    ]
    setImportedScript(['chef', 'my_guy'] as any)
    setImportedCustoms(customs)
    const game = createGame('t', 'imported', [{ name: 'A', roleId: 'chef' }], 'simple', ['chef', 'my_guy'])
    expect(game.scriptRoleIds).toEqual(['chef', 'my_guy'])
    expect(game.customCharacters).toEqual(customs)
    // Simulate reload: reset the in-session holder, read from persisted game.
    setImportedScript([] as any)
    setImportedCustoms([])
    expect(getScriptRoleIds(game)).toEqual(['chef', 'my_guy'])
  })
})
