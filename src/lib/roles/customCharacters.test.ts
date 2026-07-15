import { describe, it, expect } from 'vitest'
import { parseScriptJson } from '../scripts/import'
import { getRole, registerCustomCharacters } from './index'
import { getRoleName, getRoleAbility } from '../i18n/registry'
import { getTokenArt } from './art'

describe('homebrew custom characters (imported inline)', () => {
  it('resolves through getRole / name / ability / art after registration', () => {
    const result = parseScriptJson(
      JSON.stringify([
        {
          id: 'lantern_keeper',
          name: 'Lantern Keeper',
          team: 'outsider',
          ability: 'Each night, you glow.',
          image: 'https://example.com/lantern.png',
        },
      ]),
    )
    expect(result.customs).toHaveLength(1)
    // Before registration the app knows nothing about it.
    expect(getRole('lantern_keeper')).toBeUndefined()

    registerCustomCharacters(result.customs)

    const role = getRole('lantern_keeper')
    expect(role).toBeDefined()
    expect(role?.team).toBe('outsider')
    expect(role?.nightOrder).toBeNull() // manual board, run by hand
    expect(getRoleName('lantern_keeper', 'en')).toBe('Lantern Keeper')
    expect(getRoleAbility('lantern_keeper', 'en')).toBe('Each night, you glow.')
    // Uses the author-provided token image, not a baked asset path.
    expect(getTokenArt('lantern_keeper')).toBe('https://example.com/lantern.png')
  })
})
