# OSRS Hub 2.0

OSRS Hub 2.0 is a redesign of the existing OSRS Hub application. It retains the existing Cloudflare Worker, Discord OAuth/alerts, GE API integration, D1 schema/migrations, and established market tools.

## What's included

- Compact top navigation: Home, Trading Terminal, Screener, Tools.
- Full-width desktop workspace with responsive mobile layouts.
- Redesigned Trading Terminal cards, chart workspace, range controls and liquidity shortlist.
- Redesigned Loadout Studio equipment workspace and upgrade panels.
- Redesigned Quest Pathway and skill training planner with target level, XP remaining, budget cap, and fastest/AFK/cheapest/balanced modes.
- Reduced-motion support and subtle interaction transitions.
- Existing worker, migrations, and regression tests.

## Run locally

Requirements: Node.js 20+ (Node 22 LTS recommended) and npm.

1. Extract the ZIP.
2. Open a terminal in the extracted `OSRSHub-2.0` folder.
3. Run `npm install`.
4. Run `npm run dev` and open the local URL Vite prints.
5. Run `npm test` to execute the regression suite.
6. Run `npm run build` before uploading to GitHub/Cloudflare Pages.

Do not run `npm run db:migrate` for this UI update. It is not required and no D1 migration has been added. The UI update makes no new D1 writes; Trading Terminal history remains read-only. Existing Discord integration and worker configuration are retained.

## Deploy via your existing GitHub repository

Back up your current repository first. Upload the contents of this folder to the repository root, preserving its existing Cloudflare Pages build settings. Do not upload `node_modules`. Confirm the Cloudflare build succeeds before treating the release as live.

## Data accuracy notes

Live GE prices continue to come from the existing API and are not merged into the OSRS knowledge catalogue. Quest training rates and GP costs are explicitly estimates where they are not verified from current source-backed data. DPS/loadout estimates remain subject to the existing calculation model and its data coverage.
