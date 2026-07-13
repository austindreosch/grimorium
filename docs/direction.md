# Direction — Grimorium

Running memory of directions Austin has blessed. Product-altitude, not a spec.
Provenance tags: `·said` (his words) · `·blessed` (he explicitly picked) · `·assumed` (unconfirmed inference, quarantined).

---

## Simple Mode for game night (2026-07-12)

### Blessed forks
- Simple Mode is the only reachable experience **for now**; guided mode hidden in the UI but kept in the tree, revivable later. ·said ("i lowkey just want to not have guided mode for now") ·blessed
- Get Simple Mode **deployed live** so the tablet / live site becomes Simple Mode (not just the dev worktree). Tablet-first app. ·blessed
- Hosting: **repo made public → free GitHub Pages**, live at https://austindreosch.github.io/grimorium/. ·blessed
- Death on the board = explicit skull/heart satellite (not a disc-region tap); info-token cards write no history. ·blessed (2026-07-12)

### Resolved
- "Simple mode defaults to guided" was the **un-deployed old app**, not a code bug — the feature lived on an unpushed local branch. Now merged to master + deployed. Fixed.
- Deploy sits at project sub-path `/grimorium/` (vite base + client router BASE_URL). Live build serves correct asset paths.
