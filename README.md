# OSRS Hub — R44 Workspace Redesign

## Included
- Compact top navigation: Home, Trading Terminal, Screener and Tools dropdown.
- Full-width desktop workspace with responsive mobile layouts retained.
- Trading Terminal with multi-item price history charts, market shortlist and item analytics hand-off.
- Loadout Studio with equipment slots, combat-style selection, budget/quest constraints, auto-build, saved setups and upgrade scan.
- Quest Pathway with saved goal/checklist and a Skill Training planner comparing fastest, AFK, cheapest and balanced approaches.
- Subtle transitions with reduced-motion support.

## Install locally (Windows)
1. Extract this ZIP into a new folder.
2. Install Node.js LTS if it is not already installed.
3. Open Command Prompt in the extracted folder.
4. Run `npm install`.
5. Run `npm test`.
6. Run `npm run build`.
7. Run `npm run dev` and open the local URL Vite prints.

## Deploy
Upload the project files to the existing GitHub repository, then let the existing Cloudflare Pages pipeline build it. Do not run database migrations or deploy Worker changes unless you intend to update those systems. This release does not require a database migration.

## Data and calculation notes
- Grand Exchange prices remain served by the existing price API and are not merged into the OSRS knowledge database.
- Terminal history uses the existing timeseries API. Missing history is shown as unavailable, not invented.
- Loadout DPS remains an estimate and is not a tick-accurate simulator.
- Skill-training rates and costs in this planner are explicitly labelled planning estimates and vary by gear, unlocks, attention and current prices. Verify them before using them as an exact optimal route.

## Preserved
Discord integration, existing auth, alerts, Worker endpoints, D1 schema/migrations, and existing market API paths are unchanged by this release.
