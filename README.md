# OSRS Hub — R31–R35 Private Control Room & Loadout Intelligence

Responsive OSRS Grand Exchange research, item analytics, flip screening, equipment loadouts, alerts, finance and OSRS Brain reference search.

## R31–R35 changes

- **Private Administrator Control Room** at `/admin-control-room`, deliberately omitted from navigation. The page contains the Data Control Centre and OSRS Brain Knowledge Store. The Worker protects both `/api/data/health` and `/api/data/knowledge` server-side, so knowing the URL alone does not expose the data. Login uses an HMAC-signed, HttpOnly, Secure, SameSite=Strict cookie with an 8-hour expiry; the password is never stored in browser local storage.
- **Required one-time setup:** configure a strong Cloudflare Worker secret named `ADMIN_PASSWORD` before using the private page. From the repository folder run `npx wrangler secret put ADMIN_PASSWORD` and enter a unique password when prompted. Do not put the password in `wrangler.jsonc`, source code, GitHub, or a `.env` file committed to the repo. This is a Worker secret change, not a D1 migration. If you use Cloudflare's dashboard instead, add `ADMIN_PASSWORD` under the Worker secrets/variables settings as a secret, then deploy the Worker code normally.
- **OSRSBox static mirror fallback:** item detail and all equipment-slot requests try the official `osrsbox/osrsbox-db` GitHub static-data mirror if OSRSBox static hosting fails. If the paged REST API is unavailable, scheduled ingestion falls back to bounded 25-record batches from the static item JSON, monster JSON (using the NPC index and skipping unavailable/non-monster records), and prayer JSON sources. Each dataset has a separate persisted fallback cursor; writes still pass through the existing D1 budget governor, and the source registry records the actual fallback endpoint. A failed upstream request is never presented as successful unless the fallback batch succeeds.
- **Loadout combat-style filtering:** melee, ranged and magic builds now reject weapons and offensive gear that don't match the selected combat style. Melee/magic auto-builds omit the ammunition slot instead of filling it with arrows. Quest exclusions remain saved locally across sessions.
- **Budget-first practical selection:** auto-build prioritises the strongest style-compatible items that fit the available budget, rather than sorting primarily by a style-score/price ratio that could favour very weak gear. Unknown-price items are only considered when no priced candidates are available and remain flagged as uncertain.
- **DPS upgrade pathway:** new full-slot scan loads equipment candidates in bounded batches and lays out current gear → proposed replacement, estimated GP cost, estimated DPS change and new estimated DPS. Ranking is cost-efficiency among positive DPS gains. It remains a transparent simplified model, not a tick-accurate OSRS simulator.
- **Market sync explanation:** Data Control Centre labels the timestamp as the backend market collection sync and explains that market screens can request newer prices directly. Source errors for 522/530 show that upstream is unavailable and distinguish this from an empty catalogue.
- **Safety:** no database migrations, no D1 schema changes, no new cron schedules, no new dependencies, and no Discord code or settings changed. Existing safety scripts are preserved.

## R31–R35 verification record

- Worker syntax: `node --check worker.js`.
- Regression tests: `npm test` / `node --test tests/*.test.mjs`.
- JSX syntax: checked with the installed TypeScript JSX parser.
- ZIP integrity: checked after packaging.
- A production Vite build and live Cloudflare/browser verification must not be claimed unless those are run successfully in the install environment. This release requires the `ADMIN_PASSWORD` secret to be configured after the Worker code is uploaded; without it, admin endpoints fail closed with HTTP 503.

## R27–R30 changes

- **Loadout crash fix:** moved the GP-price and armour-slot helpers before render-time cost calculations. The previous order could throw a JavaScript temporal-dead-zone `ReferenceError` when the Loadout component rendered. This is now covered by a regression test.
- **Account Studio:** combined Loadout, the existing Calculations tools, account overview and combat/PvM intelligence behind three internal tabs: Gear & DPS, Calculators, and Account intelligence. The Tools menu now shows one Account Studio entry instead of separate Loadout and Calculations pages. `/loadout` and `/calculations` remain supported as legacy paths and open Account Studio. Existing loadout, budget, quest-exclusion, saved-build and slot-lock local-storage keys are retained.
- **Item analytics back-to-top:** full item analytics opened from Home or Screener now includes a visible “Back to top” control alongside the return-to-page action.
- **Backtester onboarding:** added an on-page walkthrough and three editable strategy presets: Balanced (10m GP), Small bankroll (1m GP), and Patient exit (25m GP). Presets only set inputs; the app still needs actual historical observations before producing results and does not fabricate example profit figures.
- **Data Control Centre:** added to Intelligence using the existing `GET /api/data/health` endpoint. Shows source status/errors, market sync age, catalogue counts, ingestion pause state and the internal daily write estimate. It is read-only: no ingestion trigger, retry, D1 writes, schema changes or Worker modifications.
- **Responsive pass:** added mobile-first layouts for Account Studio, Data Control Centre, the backtester tutorial and item analytics controls.
- **Safety:** Worker, Discord integration, migrations and existing `.bat` scripts are unchanged. No new scheduled jobs, endpoints, dependencies or database writes are introduced.

## R27–R30 validation record

- `node --test tests/*.test.mjs`: **51/51 tests passed** in the authoring environment.
- JSX transpilation parse: **passed** using the installed TypeScript compiler.
- `node --check worker.js`: **passed**; Worker source was not changed.
- Production `npm run build`: must be run in an environment with installed dependencies. If Vite is unavailable, this check is not passed and the ZIP must not be described as production-build verified.
- Desktop and actual iPhone browser testing: not performed in the authoring environment; verify these after installing the ZIP locally.

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

Extract the ZIP and upload the contents of the `OSRSHub` folder into the root of the existing repository, replacing matching files. This R31–R35 update changes `worker.js`, `src/main.jsx`, `src/upgrade.css`, `package.json`, `README.md`, and the existing `tests/app-regression.test.mjs` / `tests/movement-endpoint.test.mjs`; it adds `tests/r31-admin-loadout.test.mjs`. The R24–R26 `src/market-radar.js` and `tests/market-radar.test.mjs` and the R23 `src/backtest.js` and `tests/backtest.test.mjs` remain required and are included in the ZIP. No new `.bat` scripts are added. Keep `src/`, `worker.js`, `migrations/`, `tests/`, configuration, static assets and existing safety scripts. Do not upload `.env` secrets, tokens, `node_modules/`, `dist/`, `.wrangler/`, `.git/`, logs or credentials.

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

No Worker or Discord changes and no database migrations were made for R24–R26. The Market Radar reads already-loaded client-side item records and does not trigger collection. Automated tests (51 total) and JSX transpilation passed in the authoring environment. Worker syntax and `.bat` script contents are unchanged from R24–R26. The production Vite build and real desktop/iPhone browser testing must be verified locally; do not call this production-ready until those checks pass.

## R36–R38 Phases 1–3 foundation and intelligence update

See `PHASE-1-3-IMPLEMENTATION-NOTES.md` for the audit, read-only schema diagnostics, OSRSBox-to-D1 fallback behaviour, Brain evidence quality metadata, validation record and install instructions. This update does not add migrations, dependencies, background schedules or new D1 writes. The production Vite build remains unverified until run in an environment with Vite installed.

## OSRS data archive (R39)

See [`docs/OSRS-DATA-ARCHIVE-SETUP.md`](docs/OSRS-DATA-ARCHIVE-SETUP.md) for the step-by-step guide. To create a commit-pinned local OSRSBox repository archive, run `node scripts/archive-osrsbox.mjs`. To upload the archive and manifest to a private Cloudflare R2 bucket (after creating it and authenticating Wrangler), run `node scripts/archive-osrsbox.mjs --upload`. This archive process performs no D1 writes; the existing ingestion worker remains governed by the 25,000 estimated-write/day ceiling.
