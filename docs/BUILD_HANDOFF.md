# Grimorium — Build Handoff, Part 2 (Board + remaining phases)

**Date:** 2026-07-11
**Owner:** Austin Dreosch (product/design; plain-language decisions only — implementer owns all engineering internals)
**Predecessor:** `docs/ADVISOR_HANDOFF.md` (the original full plan). This doc supersedes it for everything still open, and adds the **detailed Grimoire Board UX** Austin has now specced.

Read `AGENTS.md` (== `CLAUDE.md`) first for architecture: event-sourced state, intent pipeline, perception system, effects, the design-system/token section, and the effects↔perception import-cycle warning.

---

## 0. Current state — what's already done (verified: `pnpm tc`, `pnpm test` 366 green, `pnpm build`)

**Phase 0 (correctness quick wins) — DONE, tested.** Player cap 15; nomination-cancel cleanup (`cancelNomination` in `game.ts`); Drunk excludes in-play roles; poisoned/drunk disables misregistration (`perception.ts` gate); FT can't be own red herring.

**Phase 1 (core rules) — DONE, tested.**
- Slayer routes a real `kill` intent through the pipeline (`SlayerActionScreen.tsx` + `DayActionResult.intent` + `handleDayActionComplete`), so Scarlet Woman succession fires and a Recluse can die to a Slayer shot (narrator perception step). `slayer-bullet` effect now **lazy-loads** the screen — do not undo that (see AGENTS.md import warning).
- Star-pass / any night death now announced: `startDay` derives deaths from the dead-effect diff since `night_started` (generic; also fixes redirect kills).
- Minions no longer learn the Demon's character (`EvilTeamReveal.tsx`).
- Chef per-pair misregistration (`chef/index.tsx` — `countEvilPairs(state, observer, pairOverrides)` + per-pair narrator step).
- "False info" → "arbitrary info" wording (EN + ES), malfunction picker already allows the true value.

**Phase 3 foundation — DONE.** This is the groundwork the Board consumes:
- Assets in `public/assets/`: `characters/tb/*` (official 400×400 webp, `_g`/`_e` tints), `characters/generic/*` (fallbacks), `textures/` (pback.png parchment, ccc-parchment, flower), `fonts/` (Dumbledor, IM Fell English, EB Garamond, Eudoxus, Cinzel), `editions/tb/logo.webp`.
- `@font-face` in `src/index.css`; Tailwind families `font-token`/`font-tarot` (Dumbledor), `font-flavor` (IM Fell), `font-read` (EB Garamond), `font-body` (Eudoxus); `board.*` palette (leather/ink/good-blue/evil-red/gold).
- `src/lib/roles/art.ts` — `getRoleArt(roleId, team)` → art URL (handles `fortune_teller`→`fortuneteller`, generic fallback), `PARCHMENT_TEXTURE`.
- **`CharacterToken`** (`src/components/items/CharacterToken.tsx`) — parchment disc + art + SVG curved name + shroud when `dead`. Props: `{ roleId, team, name?, size?, dead?, onClick?, className? }`.
- **`ReminderToken`** (`src/components/items/ReminderToken.tsx`) — parchment pip, icon + small-caps label. Props: `{ icon, label, size?, tone?, onClick?, className? }`.
- `PlayerRoleIcon` now delegates to `CharacterToken`, so real token art already renders everywhere player icons appear.

**Still open: Phase 2 (Board — §1 below, fully specced), Phase 3 screen sweep (§2), Phase 4 content/scripts (§3), Phase 5 polish (§4).**

Nothing is committed yet — the above sits in the worktree. Commit Phases 0–1 + the design foundation before starting new work if you want clean history.

---

## 1. Phase 2 — The Grimoire Board (FLAGSHIP)

A live, hands-on board layered over the existing engine (handoff "option C"): the app keeps auto-bookkeeping **and** the storyteller can mark effects by hand, dragging reminder pips player-to-player exactly like the physical grimoire. Manual actions route through the same engine so history + win-detection stay correct.

New screen `GrimoireBoard`, reachable from the night dashboard and the day phase (it replaces/absorbs the old list-style `Grimoire.tsx` modal). iPhone-first: must pan/scroll cleanly.

### 1a. Board layout & shell

- **Circle auto-layout** of player tokens from `state.players` (array order == seating order). Evenly spaced on a circle; radius scales with player count and viewport. Center of the circle is empty space (used for the drag-to-remove target and demon-bluff re-view button).
- Each seat renders a **`BoardToken`** (§1b) built on the existing `CharacterToken`.
- **Cosmetic drag-to-reposition**: a token may be dragged to a custom x/y. These offsets have **no game meaning** — persist them outside history, in `localStorage` keyed by game id (add helpers to `src/lib/storage.ts`, e.g. `getBoardPositions(gameId)` / `setBoardPositions(gameId, map)`). Never write positions to `game.history`.
- Background = board leather (`bg-board-leather`); tokens are the parchment discs. Use the `board.*` palette.

### 1b. Token interaction — "simple mode" (Austin's spec + the two reference images)

State machine per token: `collapsed` → `expanded` → (`info` | spawning a pip). See `docs/*attachments*` / the images Austin provided; summary:

**Collapsed (Static).** Just the `CharacterToken` (disc + art + curved name). Any pips already on the player orbit the disc (§1c).

**Tap → Expanded.** Disc grows slightly; **3 satellite buttons** fade/pop in:
| Button | Position | Colour | Action |
|---|---|---|---|
| ⓘ info | top | grey | Flip/expand the disc to the **Info** state (ability text). |
| 🍃 leaf | right | orange | **Character reminders** — fan out this role's own reminder tokens. **Only shown if the role has reminders.** |
| ⊞+ | left | purple | **Full library** — open the all-tokens panel with a search bar. |

Tapping empty board space (or the token again) collapses back to Static.

**Info state (ⓘ).** The disc expands into a taller parchment card: role art at top, **ability text** below (official verbatim text once Phase 4 lands; until then `getRoleDescription`). A **black circular back-arrow** button sits top-center — tap it to return to Expanded/Static. This is the "flip the token over" gesture.

**Character reminders (🍃, orange).** Tapping the leaf fans out the role's reminder tokens as **orange pips** arranged to the right of the disc (see image 2 "Character Specific Tokens"). Each pip shows the reminder's icon/label. Picking one **spawns a draggable pip** (§1d).

**Full library (⊞+, purple).** Tapping opens a **purple-bordered panel** (image 2 "All Other Tokens" + image 1): a **search bar** at top, then a **grid of every reminder token in the game** (all in-play roles' reminders + generic markers). Picking one **spawns a draggable pip** (§1d).

Build `BoardToken` as a wrapper around `CharacterToken` (do not fork the disc rendering). Satellite buttons = small circular buttons; use `Icon` (`info`, a leaf icon — add to `IconName` if missing, `layoutGrid`/`plus` for the library). Animate with the existing Tailwind keyframes (`popover-in`, etc.) or a spring — do NOT add a new animation dep (`@use-gesture/react` and CSS are already available).

### 1c. Reminder pips == effects (data model)

A pip on a player **is an `EffectInstance`** on that player. Two kinds:

1. **Mechanical reminders** → an existing effect the engine reacts to: `poisoned`, `safe`, `red_herring`, `drunk`, `deflect`, `martyrdom`, `pure`, … Dropping a "Poisoned" pip on a player = add the `poisoned` effect to them. The engine then behaves correctly (info roles malfunction, etc.).
2. **Pure-marker reminders** → official reminder tokens with no mechanical effect (Washerwoman "Townsfolk", Investigator "Wrong", Undertaker "Died Today", "No Ability", etc.). Add a new **generic `reminder` marker effect** (`src/lib/effects/definition/reminder/index.tsx`, `defaultType: 'marker'`, no handlers) whose instance data carries `{ label, icon, sourceRoleId }`. Its `Description` renders the label. Purely visual; the narrator's memory aid.

Adding a pip:
- Mechanical → `addEffectToPlayer(game, targetId, effectType)` (already exists in `game.ts`; same path as `EditEffectsModal`). This is a **direct narrator override**, not a pipeline intent — correct for markers/poison/safe.
- Marker → `addEffectToPlayer` with the `reminder` type + instance data (may need a small `addEffectToPlayer` overload or a new `addReminderToPlayer(game, targetId, {label, icon, sourceRoleId})` that sets `data`).

Removing a pip → `removeEffectFromPlayer(game, targetId, effectType)`.

Pips orbit the disc: compute N positions around the `CharacterToken` circumference; render each as a `ReminderToken`. Filter which effects show with the existing `filterVisibleEffects` (dead/drunk have their own token treatment — dead = shroud, drunk = tell).

**Life/death is special.** Do NOT mark death by dropping a raw `dead` effect (that bypasses the pipeline → no Scarlet Woman succession, no correct win-detection). Give the token a dedicated **life/death toggle** (a satellite or a tap on the shroud region) that routes through an `execute`/`kill` intent via the pipeline (reuse `resolveIntent` + `processPipelineResult` as `handleDayActionComplete` does), so board-initiated deaths stay correct. Reviving (narrator correction) can remove the `dead` effect directly.

### 1d. Drag mechanics (no new dependency)

Spawn → drag → drop, using native pointer events or the already-installed `@use-gesture/react` (see `PlayerEntry.tsx` for a working `useDrag` example). Do **not** add a drag library.

- **Spawn**: picking a reminder from the orange fan or the purple library creates a floating pip that follows the pointer immediately (pointer capture from the pick gesture, or render the pip at the touch point and start a drag).
- **Follow**: render a single "drag ghost" pip (portal / absolutely-positioned, `pointer-events-none`) tracking `clientX/clientY`.
- **Hit-test on drop**: keep a `Map<playerId, DOMRect>` measured on layout (ref callbacks on each token, remeasure on resize/scroll). On `pointerup`, find the player whose rect contains the pointer → attach the effect there. If over the **center drop-zone / off any token** → remove (for existing pips) or cancel (for a fresh spawn).
- **Move an existing pip**: pointer-down on a placed pip starts the same drag; drop on another player moves it (`removeEffectFromPlayer(from)` + `addEffectToPlayer(to)`); drop in the center/off → remove.

Keep everything one `pointermove` handler + a drop resolver. Cap re-renders (only the ghost updates during move).

### 1e. Reminder catalog (what the menus list)

Build `src/lib/reminders/catalog.ts`:
- Seed from `roles.json` (`/Users/austin/Projects/gamedev/botc/art-resources/roles.json`) — each role has `reminders` (+ some `remindersGlobal`). Copy the TB subset into a static table `ROLE_REMINDERS: Record<RoleId, ReminderDef[]>` where `ReminderDef = { label, icon: IconName, effectType?: EffectId }`.
- Map labels that have a mechanical effect to that `effectType` (seed: `Poisoned`→`poisoned`, `Protected`(Monk)→`safe`, `Red Herring`→`red_herring`, `Is The Drunk`→`drunk`, `Safe`(Soldier)→`safe`). Everything else = pure marker (no `effectType`).
- `getCharacterReminders(roleId)` → the orange menu list.
- `getAllReminders(state)` → the purple library: reminders of every in-play role + a set of generic markers (Good/Evil/Custom "?"). Searchable by label (simple `includes` filter).

Keep it generic and data-driven — no `if (roleId === …)` in the Board UI.

### 1f. Absorbs / extra board features

- **Spy grimoire view** (GH#18): the Spy is shown the board (all roles + reminders, incl. Washerwoman/Librarian/Investigator pings). A read-only `GrimoireBoard` variant reachable from the Spy's night action.
- **Re-view demon bluffs anytime**: persistent access from the board (a button in the center / a menu) that re-shows the Imp's 3 bluffs. Bluffs are recorded in history (imp first-night entry `data.bluffRoleIds`).

### 1g. Wiring

- Add a `GrimoireBoard` screen to `GameScreen.tsx`'s screen union + a button to open it from `NightDashboard` and `DayPhase`.
- All mutations go through existing `game.ts` helpers (`addEffectToPlayer`, `removeEffectFromPlayer`, `resolveIntent` for death) so history stays complete and `checkWinCondition` runs after board-initiated deaths.
- Positions are the only board state kept outside history (localStorage).

---

## 2. Phase 3 — remaining screen sweep (foundation already done)

Sweep each screen onto the board palette + real art. Order by visibility:
1. **Role reveal** (`RoleCard` + `RoleCard/CardIcon`) — swap the central Lucide icon for the real token art (use `getRoleArt` / a large `CharacterToken`); parchment card treatment. This is the "this is my token" moment.
2. **Night dashboard, day phase, voting, nomination** — apply `board.*` palette (leather chrome, parchment where a "piece" is shown), Dumbledor headers (already global via `font-tarot`).
3. **Reveal/info screens** (`OracleCard`, `VisionReveal`, `DawnScreen`, `DeathRevealScreen`) — parchment + ink.
4. Edition logo (`/assets/editions/tb/logo.webp`) on menu + script screens.
5. Retire the legacy `grimoire`/`mystic`/`parchment` Tailwind tokens as each screen migrates; kill the purple "mystic" accent.

Show Austin one fully-restyled screen for palette sign-off before sweeping the rest (show, don't ask).

---

## 3. Phase 4 — content & scripts

1. **Ability text (verbatim).** Import `ability` from `roles.json` into each role's i18n `en` (add an `ability` key; keep the existing paraphrase as flavour). Translate faithfully for `es`. Wire `ability` into the RoleCard + the Board's Info state. This is a **data import**, not writing — `roles.json` has official text for all TB roles (note id deltas). Good candidate to delegate to one focused agent; keep `pnpm tc`/`pnpm test` green.
2. **Night-order verification.** Cross-check each role's `nightOrder` against `/Users/austin/Projects/gamedev/botc/art-resources/night_order.json`; fix discrepancies.
3. **JSON script import.** Parse official script-tool JSON (array of role ids, or `{id,name,author}` + ids) → build a script from `ROLES`; unknown ids get generic art + custom-role handling. New `src/lib/scripts/import.ts`; UI in `ScriptSelection`.
4. **Setup-flow reorder** (Austin's decision): player count → **assign roles** → **name players**, allowing assign/reveal on the fly (e.g. Drunk decided late by seat). Touches `PlayerEntry`, `RoleSelection`, `RoleAssignment`, `ScriptSelection` order.
5. **Setup-step context.** When the narrator configures a role (Drunk believed role, FT red herring), show that role's ability text on the setup screen.

---

## 4. Phase 5 — polish / mobile / extras

- **Mobile pass**: nested-scroll on iPhone; the Board must pan cleanly; delete-trashcan off-screen on narrow Android (GH#25); card text-overflow cluster (GH#17/#12/#3).
- **Undo per step**: event-sourced history makes this cheap — pop the last history entry with a confirm (generalise `cancelNomination`'s slice approach). Expose in narrator UI.
- **"Random" bag option** beside Simple/Interesting/Chaotic.
- **pt-BR scaffold** — confirm i18n structure takes a third language cleanly (volunteer exists).
- **Haptics** on key actions (GH#22) via `navigator.vibrate` (progressive enhancement).
- **Continue-game across tab/PWA** (GH#24): add game export/import (JSON of `Game`) and/or document the storage-scope limitation.

### Backlog (do NOT build now)
Kill-sinking (demon targets a dead player); Bad Moon Rising / Sects & Violets / Travellers (art+data already local; unlocked by JSON import + verbatim pipeline); community-script server.

---

## 5. Engineering rules & file pointers

**Rules (non-negotiable — from AGENTS.md):**
- Event-sourced, immutable state; every meaningful action = a history entry. Board deaths route through the pipeline; markers/poison/safe go through `addEffectToPlayer`.
- No role-specific logic in `game.ts`. Info roles use `perceive()`. No `if (roleId === …)` / `if (effectId === "poisoned")` — use `getAmbiguousPlayers`, `canRegisterAs`, `isMalfunctioning`.
- **Never let the effects module graph eagerly import `pipeline/perception` or the `pipeline` barrel** (breaks `getEffect` test mocks — see the Slayer lazy-load). If a new effect references a screen that uses `perceive()`, `lazy(() => import(...))` it.
- Reuse `CharacterToken` / `ReminderToken`; do not re-implement the disc.
- i18n for all user-facing text, EN + ES. Tests: behaviour not metadata; `pnpm test` (Vitest) must stay green (CI blocks deploy).

**Key files:**
- Tokens/art: `src/components/items/CharacterToken.tsx`, `ReminderToken.tsx`, `src/lib/roles/art.ts`.
- Effects: `src/lib/effects/definition/*`, register in `effects/index.ts` + `EffectId` in `effects/types.ts`. Add the generic `reminder` marker effect here.
- Board mutations: `addEffectToPlayer` / `removeEffectFromPlayer` / `resolveIntent` / `applyPipelineChanges` in `game.ts` + `pipeline/index.ts`.
- Screen host + drag reference: `GameScreen.tsx` (screen union, `processPipelineResult`), `PlayerEntry.tsx` (`useDrag` example).
- Storage: `src/lib/storage.ts` (add board-position helpers).
- Reminder source data: `/Users/austin/Projects/gamedev/botc/art-resources/roles.json` (`reminders`), `night_order.json`.

---

## 6. Verification per phase

- **Phase 2**: full mock game on an iPhone-size viewport — expand a token, open both reminder menus, spawn a pip, drag it onto a player, move it, drag it off to remove; toggle a death and confirm Scarlet Woman succession + win-detection still fire; confirm history stays coherent and positions persist across reload. Screenshot the board.
- **Phase 3**: visual pass vs the token-scan reference; parchment/ink contrast at AA.
- **Phase 4**: import an official TB script JSON and a custom one with unknown roles; spot-check a few abilities against the almanac.
- Always: `pnpm tc` clean, `pnpm test` green, `pnpm build` succeeds before declaring a phase done.

---

## 7. What needs Austin (product-level only — surface in plain language)
- Palette/look sign-off once the first screen is fully restyled (show, don't ask).
- Whether the paraphrased ability text survives as a secondary note under the official text, or is dropped.
- Any distribution/monetization move (art + ability text are © The Pandemonium Institute — fine as a free, credited fan tool; revisit before wide release).
