# OSRS Hub V56.0 — reliability, theme, analytics and D1 diagnostics

This is a clean source ZIP for the OSRS Hub Worker + Vite React app. Discord/OAuth handler logic has not intentionally been changed; the V56 changes are focused on UI interaction, theme persistence, and site-wide data health diagnostics.

## First: important files

- `00-EMERGENCY-STOP-DATA.bat` — immediately sets the remote D1 ingestion pause flag.
- `01-RESUME-DATA.bat` — clears the pause flag.
- `02-CHECK-D1-HEALTH.bat` — checks the deployed health API, remote D1 metadata and required tables. It pauses before closing and reports what each result means.
- `03-LOCAL-BUILD-CHECK.bat` — checks Worker syntax, installs dependencies and runs the production Vite build without deploying.
- `D1-SAFE-UPDATE.bat` — installs dependencies, applies migrations, builds, then deploys. Do not run it if GitHub/Cloudflare auto-deploy is already building the same commit.
- `ROADMAP-40-IDEAS.txt` — prioritized future feature/fix backlog.

## Emergency stop / resume

1. Extract the ZIP into a normal writable folder.
2. Open the folder and double-click `00-EMERGENCY-STOP-DATA.bat`.
3. Sign in to Wrangler if asked. The script writes `data_ingestion_paused=1` to the **remote** `osrshub-accounts` D1 database.
4. Run `02-CHECK-D1-HEALTH.bat` and check `ingestionPaused:true` in the live health JSON and the D1 metadata output.
5. When ready to resume, run `01-RESUME-DATA.bat`; check again. The next scheduled run can resume collection.

The switch pauses OSRS site-wide data ingestion and manual `/api/data/sync`. It does not pause the live price API reads, user/account writes or Discord alert cron. If the Worker cannot read the pause flag, it fails closed for site-wide ingestion.

## Check the deployment and database

Run `02-CHECK-D1-HEALTH.bat` from this folder. It is diagnostic only and does not deploy. Run `03-LOCAL-BUILD-CHECK.bat` to verify the frontend build before you push; it installs dependencies and does not deploy. A healthy response should include `HTTP_STATUS:200`, `ok:true`, `checks.databaseConnected:true`, `checks.marketCachePresent:true` (after initial sync), and a recent `marketSyncAgeMinutes` when ingestion is enabled. If `ingestionPaused:true`, that means the emergency switch is on—not that D1 itself is broken. `d1Writer` is an internal estimated budget; Cloudflare Dashboard → D1 → `osrshub-accounts` → Metrics is authoritative for actual rows written.

## Update / deploy

1. Upload the project source to GitHub and wait for the Cloudflare Pages/Workers build if Git integration is enabled.
2. If deploying manually, run `D1-SAFE-UPDATE.bat` from the project root instead. Do not do both for the same commit.
3. If the build fails, copy the complete log starting at the first error; do not delete migrations or change the database ID as a guess.

The ZIP intentionally excludes `node_modules/`, `.wrangler/`, `.git/`, `dist/`, generated `site/` and secrets. `npm run build` creates the `site/` assets used by `wrangler.jsonc`.

## Data behaviour and D1 budget

- Live GE prices remain fed by the existing prices API and frontend cache; D1 is for durable market history, shared site intelligence and OSRS reference data.
- Scheduled market sync is gated to every 15 minutes even though the Worker cron wakes every minute. It incrementally updates a small liquid market sample and a small mapping chunk; richer catalogue sources are gated to a longer interval.
- The internal writer governor is set to 7,000 estimated rows/day as a conservative app-side brake. It is not Cloudflare billing telemetry and its count can differ from real rows written.
- D1 stores shared site-wide data. Account/auth state remains a separate purpose; the ingestion emergency stop does not disable account writes.

## V56 fixes

- Fixed theme loading to accept both legacy raw-string localStorage values and JSON-encoded theme values; theme choice is saved locally under both known keys.
- Fixed the routed full item page from inheriting the fixed modal overlay / body scroll lock classes, which caused the mobile freeze and graph clipping.
- Reserved mouse-wheel input over the graph for graph zoom and prevented the wheel event from scrolling the document while over the graph.
- Added click-outside dismissal for Chart options.
- Added opaque, theme-aware Item DNA surfaces; Void styling for global item search, search suggestions and Historical Margin Scanner.
- Unified recommended-flip rows into compact, consistent list rows instead of nested grey cards.
- Spaced Market Weather percentages and labels so they do not collide.
- Added a live `/api/data/health` response with D1 table counts, ingestion pause state, sync timestamp/age, metadata and internal budget indicators.
- Replaced ambiguous D1 check utility with an explicit three-part health check that does not silently close.
- Kept the live prices API path independent of the D1 ingestion pause.

## Honest limitations

A successful ZIP/Worker syntax check is not the same as a full frontend build or browser test. This package must still pass `npm install` and `npm run build` in your Cloudflare/GitHub environment, followed by a real desktop/mobile smoke test. Loadout is still a bonus/requirements-based gear helper and a transparent approximate combat model; it is **not** a complete tick-accurate OSRS DPS simulator. “Knows everything” requires a staged, sourced knowledge ingestion plan rather than claiming one build contains all OSRS mechanics.
