# OSRS Hub — Phases 1–3 implementation notes (R36–R38)

This is a code-only foundation/intelligence update based on the R31–R35 Private Control Room / Loadout Upgrade Path release.

## Phase 1 — Foundation audit and diagnostics

- Kept the existing R31 administrator gate for `/api/data/health` and `/api/data/knowledge`; the private dashboard remains absent from public navigation.
- Health diagnostics now check core tables independently. If one table is missing or inaccessible, the endpoint can still return the rest of the report and explicitly lists `schema.missingOrUnavailable` rather than failing the entire diagnostic response.
- The health response now exposes `checks.schemaHealthy` in addition to the existing market cache, sync, pause and write-budget checks.
- This is read-only. No database schema migration or live database change is included.

## Phase 2 — OSRS data foundation resilience

- Item detail requests still try both OSRSBox static hosting and the GitHub mirror first.
- If both upstreams fail, `/api/itemstats?id=...` now attempts a read-only fallback to the stored OSRSBox item record, then the stored item catalogue entry.
- Equipment-slot requests can fall back to the stored equipment catalogue, joined with stored item records.
- Responses explicitly identify the source and mark stored fallback responses as `X-OSRSHub-Data-Freshness: stale-fallback`. Fallback responses are `no-store` so browsers do not mistake an outage fallback for a fresh upstream response.
- No new D1 writes, ingestion schedules, tables or dependencies were added. Existing bounded ingestion, write-governor and emergency-stop behaviour remains in place.

## Phase 3 — OSRS Brain evidence quality

- Brain search results now include a source-derived confidence estimate, freshness label (`recent`, `aging`, or `stale`) and approximate age in hours.
- Item-name index-only records receive a lower confidence estimate than detailed structured records; Wiki reference extracts are marked as reference evidence, not complete authoritative game data.
- Result ranking now prioritises exact name matches, then name prefixes and other relevant matches, with a modest structured-source and freshness adjustment.
- The private Brain result UI displays the source, last-updated date, freshness label and confidence percentage.
- Existing read-only behaviour is retained. The endpoint does not fabricate historical prices, drop chances, profit or trade-fill guarantees.

## Existing systems deliberately preserved

- Discord integration, OAuth/auth handlers, alert delivery and scheduled Discord alert code were not intentionally changed.
- Existing migrations were not edited and no migration was added.
- Existing `.bat` files were not edited; this release does not require running them for these changes.
- Existing graph presentation and market chart behaviour were not changed.
- No Cloudflare deployment, secret change, remote migration or production database write was performed by this build process.

## Validation

- `npm test`: 60/60 tests pass in the authoring environment.
- `node --check worker.js`: passed.
- JSX parse: checked using the globally installed TypeScript compiler's JSX parser.
- `npm run build`: **not verified** because Vite is not installed in the authoring environment (`vite: not found`). Install the project's declared dependencies locally and run `npm run build` before deployment.
- No live Cloudflare or real-browser verification was performed.

## Install notes

1. Extract the ZIP and replace the repository files with the included project files, or copy the changed files into the matching repository paths.
2. Keep your current Cloudflare bindings/secrets and GitHub configuration unchanged.
3. Do not run `npm run db:migrate` for this release; it has no migration changes.
4. Ensure the existing `ADMIN_PASSWORD` Worker secret remains configured so the private Control Room works.
5. Locally run `npm install`, `npm test`, and `npm run build`. Review the diff, then deploy through your normal Cloudflare/GitHub process only when you are ready.

## R39 — Versioned OSRSBox archive workflow

- Added `scripts/archive-osrsbox.mjs`, a dependency-free Node script that downloads the full OSRSBox GitHub repository ZIP pinned to an exact commit, calculates SHA-256, and writes a JSON manifest.
- Optional `--upload` uploads the versioned ZIP and manifest to a private Cloudflare R2 bucket using Wrangler. No Worker binding, new secret, database schema change or D1 operation is needed for this upload.
- Added `docs/OSRS-DATA-ARCHIVE-SETUP.md` with the Windows tutorial, R2 setup, troubleshooting, separation from the GE feed, licensing note, and D1 budget safeguards.
- Added `data-archive/` to `.gitignore` so large downloaded source snapshots do not accidentally enter GitHub.
- The archive is a recoverable raw-source snapshot; it does not itself make every source record searchable. Existing bounded Worker ingestion continues to populate D1 under the 25,000 estimated-write/day governor.
- The archive was not downloaded or uploaded during this build; that requires network access and the user's Cloudflare account/bucket. No live D1 writes or deployment were performed.

## R39 validation

- `npm test`: 63/63 passed.
- `node --check worker.js` and `node --check scripts/archive-osrsbox.mjs`: passed.
- Production Vite build and live Cloudflare verification remain untested in this environment.
