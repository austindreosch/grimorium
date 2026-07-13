# Grimorium — Simple Mode Handoff (build in entirety)

**Date:** 2026-07-12
**Owner:** Austin Dreosch (product/design; plain-language decisions only — implementer owns all engineering internals)
**Predecessors:** `docs/ADVISOR_HANDOFF.md`, `docs/BUILD_HANDOFF.md`. This doc supersedes both for **Simple Mode** and the Grimoire Board UX Austin has now fully specced via mockups.

Read `AGENTS.md` (== `CLAUDE.md`) first for architecture: event-sourced state, intent pipeline, perception system, effects, the design-system/token section, and the effects↔perception import-cycle warning.

---

## 0. North star

**Simple Mode is the product.** Austin does not intend to use the guided/auto-managed mode. Build Simple Mode as the primary, default experience. Do **not** delete guided mode (it works, tests cover it, it's the engine's proving ground), but invest **zero** new effort in it. New Game should land in Simple setup by default.

Simple Mode = a **hands-on digital grimoire**. The storyteller runs the whole game by hand: real character tokens in a circle, drag reminder pips, flip tokens for ability text, toggle life/death, reassign characters, and flash player-facing "info token" cards. Reference panels (script sheet, night order) ride along the right edge. No step-by-step guidance, no auto phase transitions, no auto win-declaration.

Everything the storyteller does still routes through the existing engine (`addEffectToPlayer`, `removeEffectFromPlayer`, kill/execute intents through the pipeline) so state stays coherent — but nothing is *forced*.

---

## 1. What already exists (this session + prior phases)

**Mode plumbing — DONE (in worktree, tsc + 379 tests green):**
- `Game.mode?: 'guided' | 'simple'` (`src/lib/types.ts`, defaults `'guided'` when absent for back-compat).
- `createGame(name, scriptId, players, mode = 'guided')` (`src/lib/game.ts`).
- `ModeSelect.tsx` screen (`src/components/screens/`) — two choice cards, wired as the first new-game step in `App.tsx` (`new_game_mode` → carries `mode` through every wizard step).
- `getInitialScreen(game)` in `GameScreen.tsx` returns `{ type: 'grimoire_board' }` immediately when `game.mode === 'simple'`.
- `grimoire_board` screen's `returnTo` is now optional; `onBack` → `onMainMenu()` when absent (board is standalone in Simple Mode).
- `handleToggleDeath` skips win-check/game-over when `game.mode === 'simple'` (manual mode never auto-declares a winner).
- i18n `common.or` + `newGame.{chooseMode,chooseModeSubtitle,guidedModeName,guidedModeDesc,simpleModeName,simpleModeDesc}` added to en/es/types.

**Board foundation — DONE (Phase 3 / prior):**
- `CharacterToken` (`src/components/items/CharacterToken.tsx`) — parchment disc + official art + SVG curved name + shroud when `dead`. Props `{ roleId, team, name?, size?, dead?, onClick?, className? }`.
- `ReminderToken` (`src/components/items/ReminderToken.tsx`) — parchment pip, icon + small-caps label.
- `src/lib/roles/art.ts` — `getRoleArt(roleId, team)`, `PARCHMENT_TEXTURE`.
- `board.*` Tailwind palette (leather/ink/good-blue/evil-red/gold); fonts `font-token`/`font-tarot`/`font-flavor`/`font-read`/`font-body`.

**Grimoire Board v1 — DONE (`GrimoireBoard.tsx` 345 lines, `BoardToken.tsx` 295 lines):**
- Circle auto-layout of player tokens; cosmetic drag-to-reposition persisted via `getBoardPositions`/`setBoardPositions` (`src/lib/storage.ts`, keyed by game id, never in history).
- `BoardToken` tap → expand → **4 satellites today:** `info` (N, grey) flips to ability card, `leaf` (E, orange, only if role has reminders) fans character reminders, `layoutGrid` (W, purple) opens full library, `skull`/`heart` (**S**, red/green) toggles life/death.
- Reminder pips orbit the disc; a pip **is** an `EffectInstance`. Mechanical reminders map to real effects; pure markers use the `reminder` marker effect (`src/lib/effects/definition/reminder/`, `defaultType: 'marker'`, data `{ label, icon, sourceRoleId }`).
- `src/lib/reminders/catalog.ts` — `ReminderDef`, `getCharacterReminders(roleId)`, `getAllReminders(state)`.
- Pip drag: spawn from fan/library, drag player→player (`moveEffectInstance`), drop center/off to remove (`removeEffectInstance`). Life/death routes a `kill`/`execute` intent through the pipeline (`handleToggleDeath`), revive removes `dead` directly.
- `readOnly` variant already exists (Spy view).

**So the board already covers a big slice of the mockups: real tokens, the tap menu (info/leaf/library), reminder pips, life/death, drag.** The work below is the *delta* to the mockups.

---

## 2. Locked decisions (do not re-litigate)

1. **Tokens are real characters** — icon + curved name, always. The blue spirals in the mockups were placeholder art only. A blank/generic disc is shown **only** for a seat not yet assigned a character.
2. **Setup order:** enter players → **pick the in-play character set** (the "bag") → choose **Shuffle & pass out** (auto-deal to seats) **or Assign manually** (seats start blank; storyteller assigns on the board — for when they're handing out physical tokens in person). Both paths supported; neither forced.
3. **The in-play set drives the reference panels** — night-order and script-sheet list **only** characters in that game.
4. **Tap-menu gains a 4th cardinal action — Change Character (South).** This displaces today's life/death satellite from the S slot (see §3.2 for where life/death goes).
5. **Info Tokens** = full-screen player-facing cards: a preset **searchable library** *and* a **freeform editor** (swap token, type message). Board feature (Simple Mode).
6. **Simple Mode is default.** Guided mode gets no further work.
7. **Manual = manual.** No auto phase transitions, no auto win-declaration, no forced night order. The night-order panel is a *tracker/reference*, not a driver.

---

## 3. The build — four phases

Each phase is independently shippable and independently verifiable. Ship A→B for a usable manual grimoire; C and D layer on reference tooling and player-facing cards.

**Scope ceiling / discipline (per repo golden rules):** this is a fixed 4-phase list, not an open loop. Reuse existing components (`CharacterToken`, `ReminderToken`, `RoleSelection`, `RolePickerGrid`, `catalog.ts`) rather than forking. Do not add a drag/animation/state dependency — `@use-gesture/react` + CSS keyframes + React state are already in use. Keep `game.ts` role-agnostic; all behavior via effects/pipeline.

### Phase A — Setup: in-play selection + deal

Replace the Simple-Mode setup so it collects the in-play character set and (optionally) deals it.

- **Default New Game → Simple.** Keep `ModeSelect` reachable, but make Simple the default landing (Austin won't use guided). Simplest: `handleNewGame` → `new_game_players` with `mode: 'simple'`, and expose guided only as a secondary affordance if desired. Implementer's call on the exact entry UI.
- **In-play character selection screen.** Reuse the existing role-selection machinery — `RoleSelection.tsx` already picks "which roles are in play" for a script, with team counts. Mirror the official BOTC bag screen Austin referenced: per-team counters (Townsfolk/Outsider/Minion/Demon `n/target`), tap a token to add/remove, target = player count with the standard TB distribution. `RolePickerGrid` (`src/components/inputs/`) is the token-grid primitive.
- **Deal step.** After the bag is chosen: **Shuffle & pass out** (randomly assign the chosen characters to the entered players → `createGame` with those `{name, roleId}` pairs) **or Assign manually** (create the game with seats **unassigned** — see below — and let the storyteller set each via the S satellite in Phase B).
  - Randomness note: scripts run without `Math.random()` in some contexts, but this is normal app runtime (not a workflow script) — `Math.random()` is fine here for the shuffle.
- **Unassigned seats.** Introduce a sentinel for "seat has no character yet." Recommended: allow `PlayerState.roleId === ''` (or a reserved `'unassigned'` id) and have `CharacterToken`/`BoardToken` render a generic blank disc + name for it. `createGame` currently calls `getRole(roleId)` for `initialEffects` — guard the empty case. Do **not** invent a whole new type; a sentinel roleId is the lazy correct move.
- **Player count.** Mockups show `n / 20`. Confirm the cap against the current `MAX_PLAYERS` (Phase 0 set 15). Simple Mode is manual, so 20 is reasonable — bump the cap for Simple Mode or globally; implementer's call.

*Verify A:* start a Simple game both ways (pass-out and manual); pass-out lands real tokens on seats, manual lands blank discs; the game persists and reopens to the board.

### Phase B — Board core upgrades

- **Change Character (South satellite).** Add a 4th cardinal `Satellite` at `{ x: 0, y: satOffset }` with a swap/user icon → opens a character picker (reuse `RolePickerGrid`, scoped to the in-play set first with an "all characters" fallback). Selecting sets that seat's `roleId` (a direct narrator override; new helper `setPlayerRole(game, playerId, roleId)` in `game.ts`, mirroring `addEffectToPlayer`'s direct-override pattern, emitting a small history entry for undo). This is the primary path for the manual-deal flow and for corrections.
- **Relocate life/death** (S is now taken). **Recommended default: tap the lower/shroud half of the disc toggles life/death** — thematically it's draping the shroud, and it frees all four cardinal satellites for info / reminders / library / change-character (matching mockups 3 & 4, which show only N/E/W satellites + no death satellite). Alternative: a diagonal satellite. Implementer picks; shroud-tap is the lazy, mockup-consistent choice.
- **Add / remove players on the board.** Mockups 1–2 show a center **＋ (n/20)** to add a seat and a grey **✕** under each token to remove one. Add both. New game helpers: `addPlayer(game, name)` and `removePlayer(game, playerId)` in `game.ts` (direct overrides, history entries). New seats start unassigned (blank disc) → assign via the S satellite. Re-run circle layout on roster change.
- Keep everything routing through existing engine calls; keep `readOnly` working.

*Verify B:* on a manually-dealt board, assign every seat via the S menu; add and remove a player; toggle life/death via the new gesture; confirm reminder pips still spawn/move/remove.

### Phase C — Right nav rail + reference panels

The mockups show a right-edge vertical button rail that swaps a right-side panel. Build the rail + three panels. **All panels are reference/tracker only — read-only over the in-play set.**

- **Nav rail:** round buttons — menu (☰), script/scroll, night-order (moon), grimoire/players, etc. Active button highlights (purple in mockups). This rail is Simple Mode's top-level navigation; fold the existing floating board button into it.
- **Script sheet panel (mockup 5):** the chosen script's characters grouped by team (Townsfolk/Outsider/Minion/Demon) with icon + official ability text. Ability text already exists via `getRoleLines` / the role registry (`src/lib/i18n/registry.ts`); the in-play set filters it. Editable script title + share/export are nice-to-have, not required for v1.
- **Night-order panel (mockups 6–7):** Dusk → characters in wake order → Dawn, with a **first-night / other-nights toggle**. **Data gap:** the codebase has only a single `nightOrder: number | null` on `RoleDefinition` — there is no separate first-night vs other-night sequence and no Dusk/Dawn markers. Build a static night-order table (first-night order + other-night order per role) seeded from the canonical BOTC data (`/Users/austin/Projects/gamedev/botc/art-resources/roles.json` has `firstNight`/`otherNight` numbers per the prior handoff). Filter to the in-play set. This is a tracker; it does not drive anything.
- **Roster/players panel:** the add/remove-player affordances from Phase B can live here or on the board center — implementer's call.

*Verify C:* the script sheet and night order list exactly the in-play characters and nothing else; first/other-night toggle reorders correctly; panels are scrollable on iPhone.

### Phase D — Info Tokens (player-facing cards)

The "show the player" system (mockups 8–10). Full-screen cards the storyteller flashes to a player.

- **Card:** big character token + big message, e.g. **"THESE ARE YOUR MINIONS"**, **"YOU ARE ___"**, **"THIS IS THE DEMON"**, **"THIS IS SOME DIRECTION"**. Player-facing styling (use `PlayerFacingScreen` so the floating narrator UI hides). Back arrow to dismiss.
- **Library (mockup 9):** a searchable grid of preset card templates (colored tiles: minions/you-are/demon/direction/custom). Presets are a static catalog (new `src/lib/infoTokens/catalog.ts`), searchable by label.
- **Editor (mockup 10):** pencil/edit mode — swap the token (＋ opens a character/player picker) and type a freeform message into the dashed field. So the storyteller can author a one-off card, not just pick presets.
- **Entry point:** reachable from the board (the hand/eye rail button, or a per-token action). Info Tokens are ephemeral display — they need not write history (they're a projection aid), though logging "showed X card to Y" is a cheap nicety if trivial.

*Verify D:* pick a preset and show it player-facing; author a custom card (swap token + custom text) and show it; back returns to the board.

---

## 4. Open decisions for Austin (small)

None block Phase A. Flag these when reached; each has a sane default already chosen above:

- **Life/death gesture** — defaulting to shroud-tap (frees the S satellite for Change Character). Only surface if Austin wants a visible death satellite instead.
- **Script sheet extras** — editable title / share-export are deferred to nice-to-have; confirm if wanted in v1.
- **Info-token history logging** — defaulting to no history (pure display); trivial to add if desired.

Everything else in §2 is locked.

---

## 5. Files touched / created (map)

- **Setup (A):** `App.tsx` (default to Simple; deal step), reuse `RoleSelection.tsx` + `RolePickerGrid`, new deal screen, `game.ts` (`createGame` empty-role guard; shuffle helper), player-cap constant.
- **Board (B):** `BoardToken.tsx` (S satellite = change character; relocate life/death), `GrimoireBoard.tsx` (add/remove player, layout on roster change, character-picker wiring), `game.ts` (`setPlayerRole`, `addPlayer`, `removePlayer`), `CharacterToken.tsx` (blank/unassigned rendering).
- **Panels (C):** new nav-rail + panel components under `src/components/screens/` or `src/components/items/`, new night-order table `src/lib/nightOrder.ts` (first/other), reuse `registry.ts` ability text.
- **Info Tokens (D):** new `src/components/screens/InfoTokenCard.tsx` + library/editor, `src/lib/infoTokens/catalog.ts`, i18n for presets.
- **i18n:** add strings in `en.ts`/`es.ts`/`types.ts` for every new label (per repo rule — no hardcoded UI text).

## 6. Verification bar (every phase)

`pnpm tc` clean, `pnpm test` green, `pnpm build` succeeds. Add tests for new `game.ts` helpers (`setPlayerRole`, `addPlayer`, `removePlayer`, shuffle determinism-by-seed if seeded) and the night-order table (first/other ordering, in-play filtering). Browser-verify each phase at iPhone width. Manual actions must keep the event log complete (undo-able).
