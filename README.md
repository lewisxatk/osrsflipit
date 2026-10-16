# OSRS Hub — R15+ Multi-Area Loadout & Intelligence Candidate

Responsive OSRS Grand Exchange research, item analytics, flip screening, equipment loadouts, alerts and finance tools.

## What changed

- **Loadout Auto-build:** checks the OSRS Hub stored equipment catalogue first, then the OSRSBox item feed, and finally uses a small bundled baseline when live feeds are unavailable. It processes slots in small batches, respects entered stats, preserves existing gear when a slot cannot be filled, and clearly reports when fallback stats were used.
- **Stored equipment intelligence:** the new read-only `/api/data/equipment` endpoint joins stored OSRSBox equipment records with OSRS Hub item metadata and the compact GE price cache. It performs no D1 writes and requires no new migration.
- **Background OSRS data collection:** market snapshots continue to use the OSRS Wiki real-time prices API. OSRSBox item/monster/prayer catalogues are ingested two pages per eligible hourly run; wiki content remains paced to one page per six hours. The existing D1 write governor remains the safety limit and can pause ingestion before its 25,000-estimated-write daily ceiling.
- **Trading Terminal:** removed third-party website links. The terminal keeps its internal item search, four-chart workspace, history windows, market shortlist, refresh and retry controls.
- **Market and finance:** retains the corrected Buy = low-side offer, Sell = high-side offer and after-tax margin calculations, plus the existing Smart Flip Finder and bankroll reserve work.

## Data sources

The app uses the OSRS Wiki real-time prices API for live and historical GE observations, OSRSBox item/equipment/monster/prayer records, and Old School RuneScape Wiki content for reference information. Data is cached and ingested at controlled intervals; a stored observation or calculated score is not a guarantee of a successful in-game fill or profit. The OSRS Wiki price API requests identify OSRS Hub with a descriptive User-Agent as its documentation requests.

## Local verification

Requirements: Node.js 20+ and npm. From this folder:

```bash
npm install
npm test
npm run build
npm run preview
```

`npm test` runs the automated Worker and application regression tests. The production build must succeed before deployment. `npm run deploy` publishes to Cloudflare; it is **not** a test command. `npm run db:migrate` applies remote D1 migrations and must not be run for this update.

## GitHub upload and new-file tutorial

This release adds **no new files, migrations or `.bat` scripts**. It updates the existing `src/main.jsx`, `src/upgrade.css`, `worker.js`, `tests/app-regression.test.mjs` and this README. Upload the ZIP contents into the root of the existing repository and replace matching files. Keep the existing `src/`, `worker.js`, `migrations/`, `tests/`, `package.json`, `vite.config.js`, `wrangler.jsonc`, `index.html`, `_redirects`, `robots.txt`, `sitemap.xml`, `favicon.svg`, `.gitignore` and safety/build scripts. Do not upload `.env` secrets, tokens, `node_modules/`, `dist/`, `.wrangler/`, `.git/`, logs or credentials.

### Existing `.bat` script guide

- `00-EMERGENCY-STOP-DATA.bat` — writes the emergency pause flag to **remote D1** so scheduled market/intelligence ingestion stops. Use only if you need to pause data collection.
- `01-RESUME-DATA.bat` — clears that remote pause flag. Use only after you intentionally paused ingestion.
- `02-CHECK-D1-HEALTH.bat` — queries the live Worker health endpoint and remote D1 metadata; intended as a read-only diagnostic.
- `03-LOCAL-BUILD-CHECK.bat` — installs dependencies and runs the frontend production build locally; it does not deploy.
- `04-MASTER-RELEASE-CHECKS.bat` — local Worker syntax and frontend build checks; it does not run tests or deploy.
- `05-MASTER-TRANCHE-CHECKS.bat` — local Worker syntax, automated tests and frontend build checks; it does not deploy or migrate.
- `06-R2-TESTS.bat` — legacy-named local test/build script; runs Worker regression tests and the frontend build.
- `D1-SAFE-UPDATE.bat` — **not a test script**: it installs dependencies, applies remote D1 migrations and deploys the Worker/site. Do not run unless you explicitly intend to migrate and publish.

Do not run `npm run db:migrate` or `npm run deploy` merely to test this update; those change remote state or publish the site.

## Safety / release status

The Discord integration functions and routing were not changed. The Worker has isolated non-Discord changes for equipment reads, OSRSBox caching and paced catalogue ingestion. All six existing migrations and safety scripts are retained. No migration or deployment was run. Automated tests and Worker/JSX syntax checks are run in the preparation environment; the full Vite production build and real desktop/iPhone browser tests must still be completed locally before deployment.


## R18 — Knowledge index expansion (no new files or migrations)

This release extends the existing data platform without adding another roadmap or tutorial file to the ZIP.

- **OSRSBox item summary index:** the Worker fetches the official static `items-summary.json` catalogue, normalises it and indexes up to 50 item names/IDs per hourly ingestion cycle into `osrs_catalog`. The public file is edge-cached for 24 hours; the full summary JSON is not stored as one oversized database row. These are labelled summary-only until the richer paginated OSRSBox record arrives; summary rows cannot overwrite longer detailed records. The index is paced by the existing 25,000 estimated-write daily governor.
- **Structured OSRSBox ingestion:** items, monsters and prayers each advance one 25-record page per hourly cycle. Raw item/monster/prayer records and equipment data remain in the existing tables. This is deliberately incremental rather than a one-time bulk write that could exhaust D1.
- **Wiki knowledge ingestion:** three curated reference pages are fetched per two-hour cycle. The existing `osrs_content_catalog` stores bounded wikitext, searchable plain-text extracts, section names and up to 100 page links. The queue covers core skills, quests, gear, combat, bosses, raids and money-making references. Missing pages are skipped forward so one invalid title cannot permanently stall ingestion.
- **OSRS Brain search:** `/api/data/knowledge` now searches structured OSRSBox records and indexed Wiki pages with source provenance. `/api/data/drops` exposes drop records from stored monster JSON and only reports probability fields that the source provides. `/api/data/health` reports catalogue counts and source-sync status. All three endpoints are read-only.
- **Loadout reliability:** Auto-build checks six slots concurrently and uses an 8-second timeout per batch request path, rather than potentially waiting over a minute for eleven slow slot requests. The bundled fallback still makes no claim to be a complete gear catalogue.
- **Discord:** the Worker code before the `// V51 data platform...` marker is unchanged from the previous release. No Discord handlers, OAuth settings or notification behaviour were intentionally changed.

### Run and verify locally

1. Use the existing `03-LOCAL-BUILD-CHECK.bat` or run `npm install`, `npm test`, then `npm run build`.
2. The existing `05-MASTER-TRANCHE-CHECKS.bat` is a local check only; read its prompts before using it.
3. Do not run `D1-SAFE-UPDATE.bat`, `npm run db:migrate` or `npm run deploy` merely to test. This release adds no migration.
4. After a successful build and an approved deployment, open **Intelligence → OSRS Brain knowledge store**, refresh coverage, search an item/boss, and inspect the source status. Catalogue growth happens on scheduled Worker runs, not when you click Search.
5. If Loadout Auto-build is still empty, use the displayed build message and inspect `/api/data/health` and `/api/data/equipment?slot=weapon&limit=10`; do not assume a populated UI means the remote database is fully ingested.

**Coverage note:** this is a growing local reference index, not a promise to have captured every OSRS mechanic or every Wiki page. The full OSRSBox item catalogue index is paged into D1 gradually, and detailed records follow separately.
