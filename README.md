# OSRS Hub — R24–R26 Market Radar & Mobile Experience

Responsive OSRS Grand Exchange research, item analytics, flip screening, equipment loadouts, alerts, finance and OSRS Brain reference search.

## R24–R26 changes

- **Market Radar:** new `/market-radar` route ranks currently loaded items by flip score, after-tax margin, ROI, 24-hour volume or potential profit. Includes F2P-only, positive-margin, minimum-volume and name filters; a 60-tile overview with expand-to-all; CSV export; watchlist action; and a four-item comparison tray. Tile colour/intensity is relative to the loaded snapshot, not historical movement, probability or a forecast.
- **Mobile navigation:** Home, Screener, Radar, Watch and a secondary Tools menu; Radar is reachable in one tap. The existing Hub Brain shortcut remains available.
- **Mobile quick calculator:** a one-hand bottom sheet reuses the existing after-tax calculator, with numeric keyboards, internal scrolling, safe-area spacing and landscape adjustments. The desktop calculator remains in the header.
- **Responsive finish:** theme-token-based Radar tiles and comparison cards, larger touch targets, reduced-motion support, and separate positioning for the Brain and calculator floating controls so they do not overlap.
- **Tested helper:** `src/market-radar.js` contains deterministic ranking/filter logic, covered by `tests/market-radar.test.mjs`.
- **Safety:** no Worker or Discord changes, no migrations, no new background jobs and no added D1 writes. Radar reads the already-loaded client dataset and saves only its selected metric/comparison tray in local storage.

## R23 changes

- **Historical strategy backtester:** choose an item and 7-day hourly, 30-day 6-hour, or 6-month daily price observations; configure starting bankroll, maximum units, minimum entry spread, after-tax target, stop-loss and maximum hold; replay trades with GE tax; inspect net GP, return, win rate, drawdown, profit factor, hold time, equity curve, strategy comparisons and a full trade ledger; export all trades to CSV and save local snapshots. The simulation uses observed low/high price averages and explicitly does not claim that orders would have filled.

## Existing functionality retained from R20–R22

- **Loadout budget planner:** configure a total setup budget, a weapon cap and an armour cap. Supports GP shorthand such as `500k`, `15m` and `1b`; preferences persist locally and are included in saved/imported/exported builds.
- **Cost visibility:** each equipment slot shows an estimated GP cost when a current GE price is available. The summary separates weapon, armour, accessories/ammo, total buy-offer cost, instant-buy replacement cost and remaining budget.
- **Quest exclusions:** select quests you have not completed to filter matching equipment requirements during Auto-build and manual item selection. Known OSRSBox quest requirement metadata and a small curated list of known item locks are checked. Incomplete upstream quest metadata cannot be inferred, so verify requirements before using gear in-game.
- **Smarter selection:** Auto-build considers the entered stats, combat style, item requirements, selected quest exclusions, per-category budgets and aggregate setup budget. It prefers better style-score-per-GP among affordable items. Unpriced items are flagged in the final status message rather than represented as a confirmed total.
- **OSRS Brain quick searches:** one-tap searches for bosses, items, quests, prayers, raids and money-making make the existing stored knowledge index easier to explore.
- **No database or Discord changes:** this release adds no migrations, Worker edits, Discord edits, or new `.bat` files. Planner preferences are browser-local; saved/exported setups include the selected constraints.

- **OSRS Brain research board:** save up to 60 knowledge records locally, revisit the eight most recent searches, sort results by relevance/name/update time, open source references, and maintain a three-record comparison shortlist. Saved research stays in the browser and does not add D1 writes.
- **Loadout slot locks:** lock any equipped slot before Auto-build to preserve that weapon/armour/accessory while rebuilding the rest. Locked item costs and IDs are counted against the total/weapon/armour budgets to avoid double-selecting gear or silently treating the locked item as free. Lock choices persist locally and travel with saved/imported/exported builds.
- **Roadmap status:** R23 adds a separate, testable historical replay engine and a routed backtesting workspace. This is a substantive step, not a claim that all 390 points are complete.

## Data and estimate limitations

OSRS Hub uses the OSRS Wiki real-time prices API for market observations and OSRSBox/Wiki records for structured equipment and reference data. Prices are estimates, not guaranteed GE fills. Budget costing prefers the low-side buy offer and falls back to the available high-side quote when the buy side is missing; the UI distinguishes missing buy-offer prices from the estimated total. Quest exclusions work only when a source record contains the relevant requirement or the item is covered by the curated known-lock list. DPS and kill-rate figures remain simplified estimates, not a full game-tick simulator. The knowledge store grows incrementally and is not yet a complete offline copy of every OSRS page or mechanic.

## Local verification

Requires Node.js 20+ and npm. Run from this folder:

```bash
npm install
npm test
npm run build
npm run preview
```

The production build must pass before deployment. `npm run deploy` publishes to Cloudflare and is **not** a test command. `npm run db:migrate` applies remote D1 migrations; this release adds no migration, so do not run it for testing.

## GitHub upload

Extract the ZIP and upload the contents of the `OSRSHub` folder into the root of the existing repository, replacing matching files. This R24–R26 update changes `src/main.jsx`, `src/upgrade.css`, `package.json`, `tests/app-regression.test.mjs` and `README.md`; it adds `src/market-radar.js` and `tests/market-radar.test.mjs`. The retained R23 files `src/backtest.js` and `tests/backtest.test.mjs` provide the historical simulation logic and tests. No new `.bat` scripts are added. Keep `src/`, `worker.js`, `migrations/`, `tests/`, configuration, static assets and existing safety scripts. Do not upload `.env` secrets, tokens, `node_modules/`, `dist/`, `.wrangler/`, `.git/`, logs or credentials.

## Existing `.bat` script guide

- `00-EMERGENCY-STOP-DATA.bat` — writes a pause flag to remote D1 to stop scheduled market/intelligence ingestion. Use only when intentionally pausing data collection.
- `01-RESUME-DATA.bat` — clears that remote pause flag after an intentional pause.
- `02-CHECK-D1-HEALTH.bat` — read-only health check against the live Worker/D1 metadata.
- `03-LOCAL-BUILD-CHECK.bat` — installs dependencies and builds locally; does not deploy.
- `04-MASTER-RELEASE-CHECKS.bat` — local Worker syntax and frontend build checks; does not run tests or deploy.
- `05-MASTER-TRANCHE-CHECKS.bat` — local Worker syntax, tests and frontend build; does not deploy or migrate.
- `06-R2-TESTS.bat` — legacy-named local regression/build script.
- `D1-SAFE-UPDATE.bat` — **not a test script**. It applies remote migrations and deploys. Do not run unless you intentionally approve a deployment/migration.

## Release safety

No Worker or Discord changes and no database migrations were made for R24–R26. The Market Radar reads already-loaded client-side item records and does not trigger collection. Automated tests (46 total), Worker syntax and JSX transpilation pass in the authoring environment. The production Vite build and real desktop/iPhone browser testing have not been verified here; do not call this production-ready until the build and device checks pass.
