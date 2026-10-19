# OSRS Hub R40 — Workspaces and visual refresh

## Included
- Dedicated `/loadout-studio` route for the existing equipment builder, with melee/ranged/magic setup controls, budgets, quest/item exclusions, saved builds and DPS-based upgrade pathway.
- Dedicated `/quest-pathway` route with goal selection, a locally saved checklist, journey/requirements/training/unlocks views and account snapshot panel.
- Quest Pathway and Loadout Studio added to desktop Tools menu and mobile More menu.
- Responsive light-theme Quest Pathway styling, restrained transitions, and reduced-motion support.
- Existing Trading Terminal and existing item analytics graph are retained; terminal charts remain read-only history clients.
- Added regression tests for the new routes, local checklist persistence and responsive/reduced-motion styles.

## Data correctness
The Quest Pathway is an interactive planning workspace, not yet a fully verified OSRS dependency engine. It explicitly labels its route as provisional. Do not treat its sample quest sequence or training estimates as canonical requirements. A future data release should populate the route from validated quest records and source-backed prerequisite edges.

The Loadout Studio reuses the project's existing equipment catalogue, fallback records, style filters, budget constraints, quest/item exclusions and DPS-estimated upgrade scanner. The DPS model remains an estimate and should not be represented as a complete tick-accurate OSRS simulator.

## Safety and operations
- `worker.js` is unchanged.
- Discord/authentication/alerts implementation is unchanged.
- No migrations added or changed.
- No new D1 writes or scheduled ingestion jobs introduced by these UI routes.
- Quest checklist and selected goal are stored locally in the browser only.
- No new BAT files or dependencies added.

## Validation performed in the packaging environment
- `node --check worker.js`: passed.
- TypeScript parser TSX syntax parse of `src/main.jsx`: passed with 0 parse diagnostics.
- `node --test tests/*.test.mjs`: 67/67 passed.
- Production Vite build: not run successfully because dependencies were not available; `npm install` timed out in this environment. Run the included master checks on your PC before deployment.
