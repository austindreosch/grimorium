/**
 * Sentinel roleId for a seat with no character assigned yet (Simple-Mode manual
 * deal). Kept as `''` so `getRole('') → undefined` stays null-safe everywhere.
 *
 * This lives in its own leaf module (zero heavy imports) on purpose: presentational
 * components — `CharacterToken`, `BoardToken` — need to guard the sentinel, and
 * those components are pulled into role-definition test module graphs (via
 * `InfoRoleNightAction` → `CharacterToken`). Importing `game.ts` there would drag
 * the game controller's `pipeline`/`perception` graph in with it, which breaks
 * `vi.mock('effects')` `getEffect` mocks across every perception-deception test
 * (see the effects↔perception import-cycle note in CLAUDE.md). `game.ts`
 * re-exports these so the established `from './game'` import sites keep working.
 */
export const UNASSIGNED_ROLE_ID = ''

export function isUnassigned(roleId: string): boolean {
  return roleId === UNASSIGNED_ROLE_ID
}
