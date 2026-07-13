# Tablet Pass — Quick Setup Flow → Board (Option B, 90/10)

**Date:** 2026-07-12
**Scope:** Make the Simple-Mode setup flow tablet-native. Board is already
tablet-native (`fixed inset-0`). This plan touches ONLY the 4 setup screens
between "New Game" and landing on the board. Guided mode + all other screens
untouched.

## The flow (actual)

`PlayerEntry` → `ScriptSelection` → `RoleSelection` (the bag) → `DealScreen` → **board**

(Austin's mental model was "players → script → board"; the bag + deal steps
sit between script and board. Not changing step count — just the layout.)

## The problem

Every setup screen uses the same phone shell, repeated inline:
- header row: `flex items-center gap-3 max-w-lg mx-auto`
- body: `flex-1 px-4 py-6 max-w-lg mx-auto w-full`

`max-w-lg` = 512px. On a tablet that's a skinny phone strip centered in black.
~12 `max-w-lg` sites across the 4 files, plus fixed-column grids that don't
grow with width.

## The 90/10 move

**One shared layout wrapper, not 12 string edits.** Extract a `SetupScreen`
component (header + body container) with the tablet width baked in once. Migrate
the 4 screens onto it. Width becomes a single knob for the whole flow; the
repeated back-button header collapses into one place.

Target widths (my call — engineering internal, tuned to iPad portrait ~810 /
landscape ~1080):
- text/list body: `max-w-3xl` (768px)
- token/avatar grids: allowed to run wider (`max-w-5xl`) with more columns

### Step 1 — `SetupScreen` wrapper (new, ~1 file)
`src/components/layouts/SetupScreen.tsx`: props `{ title, subtitle?, onBack,
right?, children, wide? }`. Renders the standard back-header + a centered body
column at `max-w-3xl` (or `max-w-5xl` when `wide`). This is the single width
knob. Skipped: making it configurable per-screen beyond wide/normal — YAGNI.

### Step 2 — migrate the 4 screens
Swap each screen's hand-rolled header + `max-w-lg` body for `<SetupScreen>`.
Pure layout change, zero logic touched:
- **PlayerEntry** — bump the player-count avatar grid from `grid-cols-4
  sm:grid-cols-5` to add a tablet tier (e.g. `md:grid-cols-6 lg:grid-cols-8`);
  name-input list stays single-column but wider.
- **ScriptSelection** — script cards go `md:grid-cols-2` so tablet width is used.
- **RoleSelection** (the bag) — token grid gains tablet columns; the sticky
  team-counter header + footer bar re-centered to the new width.
- **DealScreen** — the two choice cards (Shuffle & pass out / Assign manually)
  go side-by-side `md:grid-cols-2` instead of stacked.

### Step 3 — entry screen
`ModeSelect` (if still the first tap) gets the same wrapper. Cheap.

## Explicitly NOT in scope (the 10% that's actually 90% effort)
- No touch of the board itself (already tablet-native).
- No touch of guided-mode / in-game / voting / history screens.
- No global rename of all 56 `max-w-lg` sites — only the setup flow's ~12.
- No landscape split-pane / master-detail. Single responsive column that fills
  tablet width. Add later only if it feels cramped.
- No new dependency; Tailwind breakpoints only.

## Verify
`pnpm tc` clean, `pnpm build` green. Browser-check each of the 4 screens at
iPad portrait (~810px) and landscape (~1080px): content fills the width, grids
add columns, nothing is a 512px strip. Phone width (<640px) unchanged.

## Files
- **new:** `src/components/layouts/SetupScreen.tsx`
- **edit:** `PlayerEntry.tsx`, `ScriptSelection.tsx`, `RoleSelection.tsx`,
  `DealScreen.tsx`, `ModeSelect.tsx` (layout only)
- barrel: `src/components/layouts/index.ts` if one exists
