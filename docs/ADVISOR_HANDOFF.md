# Grimorium — Full Implementation Handoff

**Date:** 2026-07-10
**Owner:** Austin Dreosch (product architect — plain-language decisions only; all engineering internals are the implementer's call)
**Repo:** fork of `csansoon/grimorium` (MIT), branch base `master`
**Mission:** Take the Reddit-beta + GitHub-issue feedback to done, ship the hands-on Grimoire Board, and restyle the whole app to look like the real Blood on the Clocktower board and pieces.

Read `CLAUDE.md` first for architecture (event-sourced state, intent pipeline, perception system). **Known CLAUDE.md drift:** role definitions now live in kebab-case folders (`src/lib/roles/definition/trouble-brewing/chef/index.tsx`, not `Chef.tsx`); `bounce` is already renamed `deflect`; several screens exist that CLAUDE.md doesn't mention (`DawnScreen`, `DeathRevealScreen`, `RolesLibrary`, `ScriptSelection`, `RoleAssignment`, `EvilTeamReveal`, `StarpassSelectUI`). Trust the code over the doc; fix the doc as you go.

---

## 1. Product decisions already made (do not re-ask)

| Decision | Choice |
|---|---|
| Ability text | **Option A — official verbatim text**, flavor notes kept below |
| Setup flow | **Reorder**: player count → assign roles → name players; allow assigning/revealing on the fly |
| Scripts | **Option A — JSON import** of official script-tool format (unlocks community/favorites later) |
| Grimoire board | **Option C — layered**: app keeps auto-bookkeeping AND a live hands-on board; manual taps route through the same engine |
| Kill-sinking (demon targets dead player) | Backlog — revisit with multi-demon scripts |
| Villager custom role | Keep |
| Self-voting | Keep (legal in official rules) |
| Design direction | **Look exactly like the real game**: official token art, parchment tokens, real board palette, token-shaped components |

---

## 2. Current state (audited 2026-07-10, this branch = bare fork import)

Already in the fork — cross off:
- Strict global night order · evil peers show name+team only · Virgin stops nomination · Drunk-Librarian arbitrary pick · Scarlet Woman same-night timing · Spy/Baron/Butler roles exist · star-pass flow (`StarpassSelectUI.tsx`) · grouped evil reveal (`EvilTeamReveal.tsx`) · `deflect` rename · self-vote enabled (nominee included in vote order) · malfunction gates in `src/lib/pipeline/index.ts`

Still broken / missing — this is the work. Everything below.

---

## 3. Asset library — `/Users/austin/Projects/gamedev/botc`

All raw material for the design revamp and content phases already exists locally. **Copy what's needed into this repo** (e.g. `public/assets/…`); don't reference absolute paths at runtime.

### Character art (the crown jewels)
`art-resources/characters/<edition>/` — official token art, **400×400 webp**, transparent:
- `tb/` — 59 files: all 22 Trouble Brewing roles × `_g` (good-tint) + `_e` (evil-tint) variants, plus TB travelers (beggar, bureaucrat, gunslinger, scapegoat, thief — plain + both tints). Naming: `washerwoman_g.webp`, `imp_e.webp`, `fortuneteller_g.webp`, `scarletwoman_e.webp` (no separators).
- `bmr/` (65), `snv/` (65), `carousel/` (143), `fabled/` (12), `loric/` (11) — future scripts, same convention.
- `generic/` — 22 fallbacks: `demon/minion/good/evil/custom/fabled` with tint variants — use for custom roles.

### Data (unlocks whole phases)
- `art-resources/roles.json` — **181 roles, official data**: `id`, `name`, `edition`, `team`, `ability` (**official verbatim text → Phase 5 ability-text task is a data import, not a writing task**), `reminders` (reminder-token labels → board tokens), `firstNightReminder` / `otherNightReminder` (narrator scripts), `setup`, `flavor`.
- `art-resources/night_order.json` — global first/other-night ordering (from bra1n/townsquare, verified against official script PDFs). Use to validate/replace the fork's `nightOrder` numbers.

### Design-language references
- `art-resources/pback.png` — 1080×1080 parchment token-back texture (the actual token look).
- `art-resources/community/ccc-parchment.png`, `ccc-sleeve.png` — more parchment textures.
- `art-resources/flower.png`, `art-resources/editions/*/logo.webp` — edition logos & ornament.
- `character-token-scans/tb/` (21 jpg), `bmr/` (25) — **photos of real physical tokens**: the ground-truth reference for color, texture, curved-name typography.
- `real/` — official PDFs: town square mat (`botc_townsquare.pdf`), life/death tokens, reminder sheets, vote/shroud sheet, rulebook + almanacs. Reference only.
- `botc-print-and-play/` — official PnP token/reminder/night-order PDFs per script.

### Fonts
`art-resources/token-design/fonts/` — 20 ttf/otf. The BOTC-look set:
- **Dumbledor1.ttf** — the token/title display face (the "Blood on the Clocktower" look)
- **IM Fell English** (regular + italic) — flavor text / old-print body
- **EB Garamond**, **Cinzel** — supporting serif options
- **EudoxusSans** (Regular/Bold) — clean UI sans (already used in Austin's design-system artifact for reminder labels)

### Prior art
A design-system HTML mockup was already built in a claude.ai session (curved token names, reminder pips, real art) — artifact `botc-design-system.html`, published at claude.ai. Recreate its decisions natively in the app; the tokens above are the same ones it used. Ask Austin for the artifact export if needed, but the components below are specified well enough to build without it.

**Licensing note:** character art, ability text, and names are © The Pandemonium Institute. Fine under their fan-content policy for a free fan tool; keep the app free and credited. Dumbledor is freeware. Flag to Austin before any wide distribution/monetization.

---

## 4. Build plan (sequenced — do in order)

### Phase 0 — Correctness quick wins (small, isolated)
1. **Player cap 20 → 15** — `src/components/screens/PlayerEntry.tsx:19` (`MAX_PLAYERS`).
2. **Nomination-cancel cleanup** — cancelling a nomination leaves nominator/nominee marked as having nominated/been nominated. Find where nomination state is recorded and make cancel restore it.
3. **Drunk: exclude in-play roles** from believed-role options — `src/lib/roles/definition/trouble-brewing/drunk/index.tsx:45` currently filters by team only. One token per character; filter out `state.players.map(p => p.roleId)`. (GH#10)
4. **Poison/drunk disables misregistration** — droisoned Recluse/Spy must register **truthfully**. Gate `canRegisterAs` / perception modifiers behind `!isMalfunctioning(target)` in `src/lib/pipeline/perception.ts`. Also means `getAmbiguousPlayers()` should not flag malfunctioning players (no perception-config step for them).
5. **FT red-herring self-assign** — upstream fixed FT picking self / being own red herring; verify in this fork, finish the half-wired part.
6. **CLAUDE.md drift pass** — folder naming, deflect, new screens (see header).

### Phase 1 — Core rules correctness
1. **Slayer through the pipeline** — `src/components/screens/SlayerActionScreen.tsx:61` applies `dead` directly. Route through a kill/execute intent so Scarlet Woman succession triggers (fixes the "Slayer+SW = instant good win" game-breaker). Same routing + perception check delivers the **"does Recluse register as Demon?" narrator screen** (GH#13) — Recluse can die to a Slayer shot if narrator says it registers as Demon.
2. **Star-pass death announced** — verify `startDay` announces the original Imp's self-kill death (`game.ts` dawn/death-collection path); Reddit report: "nobody died" after star-pass.
3. **Minions must not learn demon's role-type** — `EvilTeamReveal.tsx` still resolves `getRole(p.roleId)`; minions see "your Demon is [player]", never "Imp". Demon sees minion names only (already the case — verify).
4. **Chef/Empath per-pair misregistration** — biggest item. Current model: one alignment snapshot per ambiguous player. Correct rule: Spy/Recluse can register differently **per adjacent pair / per check**. Extend `PerceptionConfigStep` + `applyPerceptionOverrides` to support per-pair (Chef) and per-neighbor (Empath) override keys instead of one global override per player. Keep it generic (`canRegisterAs`-driven), no role-name checks.
5. **"False info" → "arbitrary info"** — Drunk/Poisoned wording says players get *false* info; rule is arbitrary (can be true). Fix i18n strings (en + es); in `MalfunctionConfigStep` allow picking the true value (soft warning, not a block).

### Phase 2 — The Grimoire Board (flagship, option C)
A live board layered over the existing engine. New screen reachable from night dashboard + day phase (replaces/absorbs the list `Grimoire.tsx` modal).
- **Circle auto-layout** of player tokens from `state.players` (order = seating order).
- **Player token component** = real-token look (see §5): parchment disc, official art, curved name.
- **Reminder tokens = effects**, auto-populated from effects in play, rendered as small draggable pips near their player. Labels come from `roles.json` `reminders` where applicable; app effects (safe, poisoned, dead…) keep their own labels/icons.
- **Tap to toggle state** — tap shroud → routes through the normal kill/execute/effect paths (real history entries; win-detection stays correct). Tap reminder → add/remove effect (same paths as `EditEffectsModal`).
- **Drag to reposition** — purely cosmetic x/y per token, native pointer events, **no drag library**. Persist positions outside game history (they have no game meaning) — e.g. localStorage keyed by game id.
- Absorbs: **Spy grimoire view** (GH#18 — Spy is shown the board incl. W/L/I pings), **re-view demon bluffs anytime** (persistent access from board/menu).
- iPhone-first: this screen must scroll/pan cleanly on mobile (see Phase 6 items — build it right the first time here).

### Phase 3 — Design revamp: "exactly like the real game" (can start in parallel with Phase 2; board is its first customer)
See §5 for the full spec. Order of operations:
1. Import assets (TB art, textures, fonts) into `public/assets/` + `src/assets/`; add `@font-face`.
2. Replace the Tailwind theme (`grimoire-dark`/`mystic-gold` etc.) with the real-board palette (§5).
3. Build the three core components: `CharacterToken`, `ReminderToken`, parchment surface/card treatment.
4. Sweep existing screens: role reveal cards, night dashboard, day phase, voting — swap Lucide role icons for real art (`PlayerRoleIcon`, `RoleCard`, `RoleBadge`, reveal screens), apply palette/type.
5. Real character icons everywhere kills the "generic icons" complaint (Reddit #16).

### Phase 4 — Content & scripts
1. **Ability text verbatim** — import `ability` (+ keep `flavor`) from `roles.json` for all TB roles into i18n en; es keeps translated ability but must be faithful to official meaning. Keep Austin's paraphrase as secondary flavor note if desired.
2. **Night order verification** — cross-check fork's `nightOrder` numbers against `night_order.json`; fix discrepancies.
3. **JSON script import** — parse official script-tool JSON (array of role ids / meta object) → build a script from `ROLES`; unknown ids get generic art + custom-role handling. Files: new `src/lib/scripts/import.ts`, UI in `ScriptSelection`.
4. **Setup-flow reorder** — count → roles → names, assign/reveal on the fly (e.g. Drunk decided late by seat). Touches `PlayerEntry`, `RoleSelection`, `RoleAssignment`, `ScriptSelection` flow order.
5. **Setup-step context** — when narrator configures a role (Drunk, FT red herring…), show that role's ability text on the setup screen.

### Phase 5 — Polish / mobile / extras
- **Mobile responsive pass** — nested-scroll on iPhone, delete-trashcan off-screen on narrow Android (GH#25), card text-overflow cluster (GH#17/#12/#3: FT cards, how-to-play cards).
- **Undo per step** — event-sourced history makes this cheap: pop last history entry with confirm. Expose in narrator UI.
- **"Random" bag option** beside Simple/Interesting/Chaotic.
- **pt-BR translation** scaffold (volunteer exists) — make sure i18n structure takes a third language cleanly.
- **Haptics** on key actions (GH#22) — progressive enhancement, `navigator.vibrate` where supported.
- **Continue-game in browser tab** (GH#24) — PWA vs tab storage scopes differ; can't merge. Add game export/import (JSON of `Game`) and/or document.

### Backlog (do not build now)
- Kill-sinking (demon targeting dead players) — needed for other scripts, touches multiple resolvers.
- Bad Moon Rising, Sects & Violets, Travelers — art + data already in the asset library; unlocked by JSON import + verbatim-text pipeline.
- Community script server / favorites folder.

---

## 5. Design-system spec — real board & pieces

Ground truth: `character-token-scans/` photos + `real/botc_townsquare.pdf` + `pback.png`. The app should read as: **black-leather grimoire background, aged-parchment tokens, official art, Dumbledor display type.**

### Palette (replace current `grimoire-dark`/`mystic-gold` Tailwind colors)
Derive final hexes from the scans/textures; targets:
- **Background:** near-black leather/wood dark (deep warm black, subtle texture ok) — the grimoire book.
- **Token/parchment surface:** aged cream/parchment (from `pback.png`), with darker mottled edge.
- **Good/Townsfolk accent:** the blue ink used on good tokens (steel/navy blue).
- **Evil/Demon accent:** the deep red ink of evil tokens.
- **Outsider / Minion:** follow official sheet colors (outsider = lighter blue, minion = lighter red/orange-red).
- **Dead/shroud:** grey-black shroud tone.
- Kill the current purple "mystic" accent unless it survives as a minor ornament.

### Typography
- **Display / token names / headers:** Dumbledor (`Dumbledor1.ttf`).
- **Flavor text:** IM Fell English Italic.
- **Body/UI:** EB Garamond for reading text; EudoxusSans for small functional UI (labels, buttons, badges).
- Subset fonts (TB character set + basic latin) before shipping — these are the whole app's feel, but keep payload sane.

### Core components
- **`CharacterToken`** — circular parchment disc (`pback.png` texture), official character art centered (`<id>_g.webp` / `<id>_e.webp` by alignment), **name curved along the bottom arc** (SVG `<textPath>`, Dumbledor). Sizes: board (~72–96px), list/badge (~40px), reveal card (large).
- **`ReminderToken`** — smaller parchment pip, effect/reminder icon top-center, label below in small caps (Eudoxus, ~10px at board size — matches the approved artifact iteration).
- **Shroud** — dead players get the black shroud overlay draped over the token top (like the physical game), not just greyscale.
- **Parchment card** — role-reveal and info cards on parchment texture with dark ink text, replacing flat dark cards where a "piece of the game" is being shown. Narrator chrome (dashboards, buttons) stays dark leather.
- **Edition logo** (`editions/tb/logo.webp`) on menu/script screens.

### Asset pipeline
- Copy `art-resources/characters/tb/*` → `public/assets/characters/tb/`; `generic/*` → `public/assets/characters/generic/`; textures → `public/assets/textures/`; fonts → `src/assets/fonts/`.
- Map role id → art path in one module (`src/lib/roles/art.ts`): handles naming deltas (`fortune_teller` → `fortuneteller`, `scarlet_woman` → `scarletwoman`), alignment tint choice, generic fallback for custom roles. No per-role hardcoding elsewhere.
- webp 400×400 is already the right format/size; no processing needed beyond copying.

---

## 6. Engineering rules (non-negotiable, from CLAUDE.md)

- Event-sourced, immutable state; every meaningful action = history entry.
- No role-specific logic in `game.ts`; interactions via intent pipeline + effects.
- Info roles use `perceive()` — never read `roleId`/team directly.
- No `if (roleId === …)` / `if (effectId === "poisoned")` checks — use `getAmbiguousPlayers()`, `canRegisterAs`, `isMalfunctioning()`.
- Every `NightAction` starts with `NightStepListLayout`.
- i18n for all user-facing text, en + es both.
- Tests: behavior not metadata; run `pnpm test` (CI blocks deploy on failure); Vitest, co-located tests, helpers in `src/lib/__tests__/helpers.ts`.

## 7. Verification per phase

- Phase 0/1: unit tests for each fix (pipeline tests for Slayer routing + SW succession; perception tests for droisoned-Recluse-registers-true; per-pair Chef tests) + play a scripted game through the UI.
- Phase 2: full mock game on iPhone-size viewport — drag, tap-shroud, reminder add/remove, Spy view; confirm history log stays coherent and win conditions fire from board-initiated deaths.
- Phase 3: visual pass vs token scans; check contrast (parchment/ink) at AA.
- Phase 4: import an official script JSON (Trouble Brewing from script tool) and a custom one with unknown roles.

## 8. What needs Austin (product-level only)

Nothing is blocked to start. Surface later, in plain language, only if genuinely forked:
- Final palette sign-off once the first restyled screen exists (show, don't ask).
- Whether paraphrased ability text survives as a secondary note under the official text, or dies.
- Any distribution/monetization move (licensing).
